import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAsaasCharge, createAsaasTokenCardCharge, getAsaasPixQrCode } from "@/lib/asaas";
import { assinarUpsell, carregarUpsell, contaAsaasPlataforma, criarCompraUpsell, sincronizarCompra } from "@/lib/compras";

// GET: o upsell disponível pra esta compra (exige a assinatura devolvida no checkout).
export async function GET(req: NextRequest, { params }: { params: Promise<{ compraId: string }> }) {
  const { compraId } = await params;
  const u = await carregarUpsell(compraId, req.nextUrl.searchParams.get("t"));
  if (!u) return NextResponse.json({ upsell: null });
  const p = u.item.produto;
  return NextResponse.json({
    upsell: {
      produtoId: p.id, nome: p.nome, beneficio: p.beneficio, descricao: p.descricao, capaUrl: p.capaUrl, icone: p.icone,
      chamada: u.item.chamada, precoCentavos: u.item.precoCentavos, cartaoFinal: u.cartaoFinal,
    },
  });
}

const schema = z.object({
  t: z.string().min(10).max(200),
  forma: z.enum(["CARTAO_SALVO", "PIX"]),
});

// POST: comprador aceitou o upsell. Cobra no mesmo cartão (token do Asaas) ou gera um Pix novo;
// o acesso sai pelo mesmo caminho das outras compras (status real do Asaas).
export async function POST(req: NextRequest, { params }: { params: Promise<{ compraId: string }> }) {
  const conta = contaAsaasPlataforma();
  if (!conta) return NextResponse.json({ error: "Pagamentos temporariamente indisponíveis." }, { status: 503 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { compraId } = await params;
  const u = await carregarUpsell(compraId, body.data.t);
  if (!u) return NextResponse.json({ error: "Esta oferta não está mais disponível." }, { status: 410 });
  if (body.data.forma === "CARTAO_SALVO" && !u.cartaoFinal) return NextResponse.json({ error: "Pague com Pix." }, { status: 400 });
  if (!u.origem.asaasCustomerId) return NextResponse.json({ error: "Não foi possível identificar o comprador." }, { status: 400 });

  const compra = await criarCompraUpsell(u, body.data.forma === "PIX" ? "PIX" : "CARTAO");
  const valor = u.item.precoCentavos / 100;
  const descricao = u.item.produto.nome.slice(0, 400);
  try {
    if (body.data.forma === "PIX") {
      const cobranca = await createAsaasCharge(conta.apiKey, conta.sandbox, u.origem.asaasCustomerId, valor, descricao, "PIX");
      await prisma.compra.update({ where: { id: compra.id }, data: { asaasPaymentId: cobranca.id } });
      const qr = await getAsaasPixQrCode(conta.apiKey, conta.sandbox, cobranca.id);
      return NextResponse.json({ compraId: compra.id, status: "PENDENTE", pix: { payload: qr.payload, imagem: qr.encodedImage }, upsellToken: assinarUpsell(compra.id) });
    }
    const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    const cobranca = await createAsaasTokenCardCharge(conta.apiKey, conta.sandbox, u.origem.asaasCustomerId, valor, descricao, u.origem.asaasCardToken!, remoteIp);
    await prisma.compra.update({ where: { id: compra.id }, data: { asaasPaymentId: cobranca.id } });
    const status = await sincronizarCompra(compra.id);
    return NextResponse.json({ compraId: compra.id, status });
  } catch (err) {
    await prisma.compra.update({ where: { id: compra.id }, data: { status: "CANCELADO", encerradaEm: new Date() } }).catch(() => {});
    console.error("[comprar/upsell]", compraId, err);
    const msg = err instanceof Error && err.message.length < 200 ? err.message : "Não foi possível concluir o pagamento.";
    return NextResponse.json({ error: msg }, { status: 402 });
  }
}
