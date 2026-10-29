import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAsaasPayment } from "@/lib/asaas";
import { generateToken } from "@/lib/auth/tokens";
import { sendAcessoProdutosEmail } from "@/lib/email";
import { produtosLiberados } from "@/lib/infoprodutos";

// Compras de infoprodutos pela conta Asaas da plataforma.
//
// Regras de segurança:
//   - total e itens são calculados AQUI a partir da oferta cadastrada; do navegador só vem quais
//     order bumps foram marcados (e só valem os que existem naquela oferta);
//   - o status de uma compra só muda pelo que o Asaas diz (consulta direta à cobrança), seja
//     disparado pelo webhook ou pela tela consultando — a página de obrigado nunca libera nada;
//   - liberação e revogação são idempotentes: rodar de novo não duplica acesso nem e-mail, e a
//     ordem em que os eventos chegam não importa (vale sempre o status atual da cobrança).

export function contaAsaasPlataforma() {
  const apiKey = process.env.ASAAS_PLATFORM_API_KEY;
  if (!apiKey) return null;
  return { apiKey, sandbox: process.env.ASAAS_PLATFORM_SANDBOX !== "false" };
}

const STATUS_PAGO = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
const STATUS_REEMBOLSO = new Set(["REFUNDED", "REFUND_IN_PROGRESS"]);
const STATUS_ESTORNO = new Set(["CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"]);
const STATUS_CANCELADO = new Set(["OVERDUE", "DELETED"]);

// Oferta pronta pro checkout: só produtos publicados; itens que o comprador logado já tem não são
// oferecidos de novo como order bump (e um principal que ele já tem aparece como "já é seu")
export async function carregarOfertaCheckout(slug: string, profileId?: string | null) {
  const oferta = await prisma.oferta.findUnique({
    where: { slug },
    include: {
      itens: {
        orderBy: { ordem: "asc" },
        include: { produto: { select: { id: true, slug: true, nome: true, descricao: true, beneficio: true, capaUrl: true, icone: true, publicado: true, categoria: true } } },
      },
    },
  });
  if (!oferta || !oferta.ativa) return null;
  const itens = oferta.itens.filter(i => i.produto.publicado && i.papel !== "UPSELL");
  const principais = itens.filter(i => i.papel === "PRINCIPAL");
  if (principais.length === 0) return null;

  const jaTem = profileId ? await produtosLiberados(profileId) : new Set<string>();
  return {
    id: oferta.id, slug: oferta.slug, nome: oferta.nome,
    principais: principais.map(i => ({ ...i, jaTem: jaTem.has(i.produtoId) })),
    bumps: itens.filter(i => i.papel === "ORDER_BUMP" && !jaTem.has(i.produtoId)),
  };
}

export type OfertaCheckout = NonNullable<Awaited<ReturnType<typeof carregarOfertaCheckout>>>;

// Itens e total da compra, no servidor
export function calcularCompra(oferta: OfertaCheckout, bumpsMarcados: string[]) {
  const marcados = new Set(bumpsMarcados);
  const itens = [
    ...oferta.principais.filter(i => !i.jaTem),
    ...oferta.bumps.filter(i => marcados.has(i.produtoId)),
  ].map(i => ({ produtoId: i.produtoId, nome: i.produto.nome, papel: i.papel, precoCentavos: i.precoCentavos }));
  return { itens, totalCentavos: itens.reduce((s, i) => s + i.precoCentavos, 0) };
}

// Consulta o Asaas e aplica o status real na compra. Chamado pelo webhook e pela tela de
// pagamento (Pix). Devolve o status final da compra.
export async function sincronizarCompra(compraId: string): Promise<string | null> {
  const compra = await prisma.compra.findUnique({ where: { id: compraId }, select: { id: true, status: true, asaasPaymentId: true } });
  if (!compra?.asaasPaymentId) return compra?.status ?? null;
  const conta = contaAsaasPlataforma();
  if (!conta) return compra.status;

  let statusAsaas: string;
  try {
    const p = await getAsaasPayment(conta.apiKey, conta.sandbox, compra.asaasPaymentId) as { status: string; deleted?: boolean };
    statusAsaas = p.deleted ? "DELETED" : p.status;
  } catch (err) {
    console.error("[compras] consulta ao Asaas falhou", compraId, err);
    return compra.status;
  }

  if (STATUS_PAGO.has(statusAsaas)) await liberarCompra(compra.id);
  else if (STATUS_REEMBOLSO.has(statusAsaas)) await encerrarCompra(compra.id, "REEMBOLSADO", "Reembolso");
  else if (STATUS_ESTORNO.has(statusAsaas)) await encerrarCompra(compra.id, "ESTORNADO", "Estorno (chargeback)");
  else if (STATUS_CANCELADO.has(statusAsaas) && compra.status === "PENDENTE") {
    await prisma.compra.updateMany({ where: { id: compra.id, status: "PENDENTE" }, data: { status: "CANCELADO", encerradaEm: new Date() } });
  }
  return (await prisma.compra.findUnique({ where: { id: compra.id }, select: { status: true } }))?.status ?? null;
}

// Pagamento confirmado: localiza ou cria a conta e grava os acessos. A troca PENDENTE→PAGO é
// condicional (updateMany com status), então duas confirmações simultâneas liberam uma vez só.
async function liberarCompra(compraId: string) {
  const compra = await prisma.compra.findUnique({ where: { id: compraId }, include: { itens: { include: { produto: { select: { nome: true, slug: true } } } } } });
  if (!compra) return;
  // Pago depois de ter sido marcado cancelado (ex: Pix pago no limite) também libera; reembolsada/
  // estornada não volta sozinha — essas mudam só por um novo status do Asaas
  if (compra.status === "PAGO" || compra.status === "REEMBOLSADO" || compra.status === "ESTORNADO") return;

  const email = compra.email.trim().toLowerCase();
  let profile = compra.profileId
    ? await prisma.profile.findUnique({ where: { id: compra.profileId } })
    : await prisma.profile.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  let tokenSenha: string | null = null;
  if (!profile) {
    // Conta nova só com a Minha Biblioteca: sem Plataforma/CRM (productsOwned vazio), já
    // "onboarded" (não cai no onboarding do CRM) e sem senha — o e-mail traz o link pra criar
    tokenSenha = generateToken();
    profile = await prisma.profile.create({
      data: {
        email, name: compra.nome || email.split("@")[0], phone: compra.telefone || null,
        onboarded: true, productsOwned: [], emailVerifiedAt: new Date(),
        passwordResetToken: tokenSenha, passwordResetExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }).catch(async () => {
      tokenSenha = null; // criada por outra confirmação ao mesmo tempo
      return prisma.profile.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    });
    if (!profile) return;
  }

  const virou = await prisma.compra.updateMany({
    where: { id: compra.id, status: { in: ["PENDENTE", "CANCELADO"] } },
    data: { status: "PAGO", pagoEm: new Date(), encerradaEm: null, profileId: profile.id },
  });
  if (virou.count === 0) return; // outra execução já liberou

  await prisma.acessoProduto.createMany({
    data: compra.itens.map(i => ({ profileId: profile!.id, produtoId: i.produtoId, origem: "COMPRA", compraId: compra.id })),
    skipDuplicates: true,
  });

  sendAcessoProdutosEmail(profile.email, profile.name, compra.itens.map(i => i.produto.nome), tokenSenha)
    .catch(err => console.error("[compras] e-mail de acesso", compra.id, err));
}

// Reembolso/estorno: revoga só os acessos que vieram DESTA compra — acesso ao mesmo produto por
// outra compra ou liberado pelo admin continua valendo
async function encerrarCompra(compraId: string, status: "REEMBOLSADO" | "ESTORNADO", motivo: string) {
  const r = await prisma.compra.updateMany({ where: { id: compraId, status: { not: status } }, data: { status, encerradaEm: new Date() } });
  if (r.count === 0) return;
  await prisma.acessoProduto.updateMany({ where: { compraId, ativo: true }, data: { ativo: false, revogadoEm: new Date(), motivo } });
}

// ─── Upsell ───────────────────────────────────────────────────────────────────────────────
// Depois da compra paga, a tela de confirmação oferece o produto UPSELL da oferta. Só quem fez a
// compra tem a assinatura (devolvida na resposta do checkout); a oferta vale por 2 horas depois
// do pagamento e nunca oferece produto que o comprador já tem. Aceitar cria uma Compra NOVA,
// ligada à original — a cobrança só acontece com a confirmação do comprador.

const JANELA_UPSELL_MS = 2 * 60 * 60 * 1000;

export function assinarUpsell(compraId: string) {
  const segredo = process.env.SESSION_SECRET ?? "";
  return createHmac("sha256", segredo).update(`upsell:${compraId}`).digest("base64url");
}

function upsellValido(compraId: string, token: string | null | undefined) {
  if (!token) return false;
  const esperado = Buffer.from(assinarUpsell(compraId));
  const recebido = Buffer.from(token);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

// Upsell disponível pra uma compra (ou null). Confere assinatura, pagamento, janela e se o
// comprador já não tem o produto (inclusive por já ter aceitado este upsell).
export async function carregarUpsell(compraId: string, token: string | null | undefined) {
  if (!upsellValido(compraId, token)) return null;
  const origem = await prisma.compra.findUnique({ where: { id: compraId } });
  if (!origem || origem.status !== "PAGO" || !origem.ofertaId || !origem.profileId || origem.compraOrigemId) return null;
  if (!origem.pagoEm || Date.now() - origem.pagoEm.getTime() > JANELA_UPSELL_MS) return null;

  const item = await prisma.ofertaItem.findFirst({
    where: { ofertaId: origem.ofertaId, papel: "UPSELL", oferta: { ativa: true }, produto: { publicado: true } },
    orderBy: { ordem: "asc" },
    include: { produto: { select: { id: true, nome: true, beneficio: true, descricao: true, capaUrl: true, icone: true } } },
  });
  if (!item) return null;
  if ((await produtosLiberados(origem.profileId)).has(item.produtoId)) return null;
  // Já há uma compra deste upsell em andamento/paga a partir desta compra → não oferece de novo
  const jaPedido = await prisma.compra.findFirst({ where: { compraOrigemId: origem.id, status: { in: ["PENDENTE", "PAGO"] } }, select: { id: true } });
  if (jaPedido) return null;

  return { origem, item, cartaoFinal: origem.formaPagamento === "CARTAO" && origem.asaasCardToken ? origem.cartaoFinal : null };
}

export type UpsellDisponivel = NonNullable<Awaited<ReturnType<typeof carregarUpsell>>>;

// Cria a compra do upsell aceito (dados do comprador vêm da compra original)
export async function criarCompraUpsell(u: UpsellDisponivel, formaPagamento: "PIX" | "CARTAO") {
  return prisma.compra.create({
    data: {
      ofertaId: u.origem.ofertaId, compraOrigemId: u.origem.id, profileId: u.origem.profileId,
      email: u.origem.email, nome: u.origem.nome, cpfCnpj: u.origem.cpfCnpj, telefone: u.origem.telefone,
      valorCentavos: u.item.precoCentavos, formaPagamento, asaasCustomerId: u.origem.asaasCustomerId,
      itens: { create: [{ produtoId: u.item.produtoId, papel: "UPSELL", precoCentavos: u.item.precoCentavos }] },
    },
  });
}

// Webhook: registra o evento (idempotência) e sincroniza a compra correspondente, se houver
export async function processarEventoAsaas(body: { id?: string; event?: string; payment?: { id?: string; installment?: string } }) {
  const paymentId = body.payment?.id;
  if (!paymentId) return false;
  const installment = body.payment?.installment;
  const compra = await prisma.compra.findFirst({
    where: { OR: [{ asaasPaymentId: paymentId }, ...(installment ? [{ asaasInstallmentId: installment }] : [])] },
    select: { id: true },
  });
  if (!compra) return false;

  // Evento já processado → nada a fazer. Ele só é gravado DEPOIS de sincronizar com sucesso: se
  // o Asaas estiver fora do ar, o reenvio do webhook tenta de novo em vez de ser descartado.
  // (A sincronização em si já é idempotente — o registro é só pra não repetir trabalho e auditar.)
  const eventoId = body.id ?? `${body.event ?? "?"}:${paymentId}`;
  const jaProcessado = await prisma.pagamentoEvento.findUnique({ where: { provedor_eventoId: { provedor: "ASAAS", eventoId } }, select: { id: true } });
  if (jaProcessado) return true;

  await sincronizarCompra(compra.id);
  await prisma.pagamentoEvento.create({ data: { provedor: "ASAAS", eventoId, tipo: body.event ?? "?", paymentId } }).catch(() => {});
  return true;
}
