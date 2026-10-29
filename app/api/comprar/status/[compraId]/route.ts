import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAsaasPixQrCode } from "@/lib/asaas";
import { contaAsaasPlataforma, sincronizarCompra } from "@/lib/compras";

// Tela de pagamento consultando a compra (Pix). Enquanto pendente, confere direto no Asaas —
// assim o acesso sai mesmo se o webhook atrasar. Só devolve status (e o QR do Pix pendente,
// pra quem recarregou a página); o id da compra é aleatório e não expõe dados pessoais.
export async function GET(req: Request, { params }: { params: Promise<{ compraId: string }> }) {
  const { compraId } = await params;
  const compra = await prisma.compra.findUnique({ where: { id: compraId }, select: { id: true, status: true, formaPagamento: true, asaasPaymentId: true } });
  if (!compra) return NextResponse.json({ error: "Compra não encontrada" }, { status: 404 });

  const status = compra.status === "PENDENTE" ? await sincronizarCompra(compra.id) : compra.status;

  let pix: { payload: string; imagem: string } | null = null;
  const querPix = new URL(req.url).searchParams.get("pix") === "1";
  const conta = contaAsaasPlataforma();
  if (querPix && status === "PENDENTE" && compra.formaPagamento === "PIX" && compra.asaasPaymentId && conta) {
    const qr = await getAsaasPixQrCode(conta.apiKey, conta.sandbox, compra.asaasPaymentId).catch(() => null);
    if (qr) pix = { payload: qr.payload, imagem: qr.encodedImage };
  }
  return NextResponse.json({ status, pix });
}
