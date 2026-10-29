import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { createAsaasCardCharge, createAsaasCharge, createAsaasCustomer, getAsaasPixQrCode } from "@/lib/asaas";
import { assinarUpsell, calcularCompra, carregarOfertaCheckout, contaAsaasPlataforma, sincronizarCompra } from "@/lib/compras";

const schema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(200),
  telefone: z.string().trim().max(20).default(""),
  cpfCnpj: z.string().transform(v => v.replace(/\D/g, "")).refine(v => v.length === 11 || v.length === 14, "CPF ou CNPJ inválido"),
  formaPagamento: z.enum(["PIX", "CARTAO"]),
  bumps: z.array(z.string().max(60)).max(10).default([]), // ids dos produtos marcados como order bump
  cartao: z.object({
    holderName: z.string().trim().min(3),
    number: z.string().transform(v => v.replace(/\D/g, "")).refine(v => v.length >= 13 && v.length <= 19, "Número do cartão inválido"),
    expiryMonth: z.string().regex(/^\d{2}$/),
    expiryYear: z.string().regex(/^\d{2,4}$/),
    ccv: z.string().regex(/^\d{3,4}$/),
    postalCode: z.string().transform(v => v.replace(/\D/g, "")).refine(v => v.length === 8, "CEP inválido"),
    addressNumber: z.string().trim().min(1).max(10),
  }).optional(),
});

// Checkout de infoprodutos (conta Asaas da plataforma). O navegador manda dados do comprador e
// quais order bumps marcou; itens e total saem da oferta cadastrada. O acesso só é liberado
// quando o Asaas confirma (aqui mesmo, se o cartão aprovar na hora, ou pelo webhook/consulta).
export async function POST(req: NextRequest, { params }: { params: Promise<{ oferta: string }> }) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Confira os dados" }, { status: 400 });
  const d = body.data;
  if (d.formaPagamento === "CARTAO" && !d.cartao) return NextResponse.json({ error: "Preencha os dados do cartão" }, { status: 400 });

  // Comprador logado: o acesso vai pra conta dele, mesmo que digite outro e-mail
  const { userId } = await auth().catch(() => ({ userId: null as string | null }));
  const { oferta: slug } = await params;
  const oferta = await carregarOfertaCheckout(slug, userId);
  if (!oferta) return NextResponse.json({ error: "Esta oferta não está disponível" }, { status: 404 });
  const conta = contaAsaasPlataforma(oferta.sandbox);
  if (!conta) return NextResponse.json({ error: "Pagamentos temporariamente indisponíveis. Tente de novo em breve." }, { status: 503 });

  const { itens, totalCentavos } = calcularCompra(oferta, d.bumps);
  if (itens.length === 0) return NextResponse.json({ error: "Você já tem estes produtos — eles estão na sua Minha Biblioteca." }, { status: 400 });
  if (totalCentavos < 500) return NextResponse.json({ error: "Valor mínimo de cobrança não atingido" }, { status: 400 });

  const compra = await prisma.compra.create({
    data: {
      ofertaId: oferta.id, profileId: userId ?? null, email: d.email, nome: d.nome, cpfCnpj: d.cpfCnpj, telefone: d.telefone,
      valorCentavos: totalCentavos, formaPagamento: d.formaPagamento, sandbox: oferta.sandbox,
      itens: { create: itens.map(i => ({ produtoId: i.produtoId, papel: i.papel, precoCentavos: i.precoCentavos })) },
    },
  });
  const descricao = itens.map(i => i.nome).join(" + ").slice(0, 400);

  try {
    const customer = await createAsaasCustomer(conta.apiKey, conta.sandbox, d.nome, d.telefone, d.cpfCnpj);
    const valor = totalCentavos / 100;

    if (d.formaPagamento === "PIX") {
      const cobranca = await createAsaasCharge(conta.apiKey, conta.sandbox, customer.id, valor, descricao, "PIX");
      await prisma.compra.update({ where: { id: compra.id }, data: { asaasPaymentId: cobranca.id, asaasCustomerId: customer.id } });
      const qr = await getAsaasPixQrCode(conta.apiKey, conta.sandbox, cobranca.id);
      return NextResponse.json({ compraId: compra.id, status: "PENDENTE", totalCentavos, pix: { payload: qr.payload, imagem: qr.encodedImage }, upsellToken: assinarUpsell(compra.id) });
    }

    const c = d.cartao!;
    const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    const cobranca = await createAsaasCardCharge(
      conta.apiKey, conta.sandbox, customer.id, valor, descricao,
      { holderName: c.holderName, number: c.number, expiryMonth: c.expiryMonth, expiryYear: c.expiryYear.length === 2 ? `20${c.expiryYear}` : c.expiryYear, ccv: c.ccv },
      { name: d.nome, email: d.email, cpfCnpj: d.cpfCnpj, postalCode: c.postalCode, addressNumber: c.addressNumber, phone: d.telefone },
      remoteIp,
    );
    await prisma.compra.update({
      where: { id: compra.id },
      data: {
        asaasPaymentId: cobranca.id, asaasCustomerId: customer.id, asaasInstallmentId: cobranca.installment ?? null,
        // Token (não o cartão) pro upsell de um clique, se a conta Asaas tiver tokenização
        asaasCardToken: cobranca.creditCard?.creditCardToken ?? null,
        cartaoFinal: cobranca.creditCard?.creditCardNumber?.slice(-4) ?? null,
      },
    });
    // Cartão responde na hora — confirma consultando o Asaas (mesmo caminho do webhook)
    const status = await sincronizarCompra(compra.id);
    return NextResponse.json({ compraId: compra.id, status, totalCentavos, upsellToken: assinarUpsell(compra.id) });
  } catch (err) {
    await prisma.compra.update({ where: { id: compra.id }, data: { status: "CANCELADO", encerradaEm: new Date() } }).catch(() => {});
    console.error("[comprar]", slug, compra.id, err);
    const msg = err instanceof Error && err.message.length < 200 ? err.message : "Não foi possível concluir o pagamento. Confira os dados e tente de novo.";
    return NextResponse.json({ error: msg }, { status: 402 });
  }
}
