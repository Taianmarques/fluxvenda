import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin-auth";
import { refundAsaasPayment } from "@/lib/asaas";
import { contaAsaasPlataforma, sincronizarCompra } from "@/lib/compras";

// Admin: estorna a cobrança no Asaas (valor total) e sincroniza — a compra vira REEMBOLSADO e só os
// acessos que vieram dela são revogados. O Asaas pode levar alguns instantes pra concluir o estorno;
// o webhook (ou "Reconsultar") aplica o status final.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  const compra = await prisma.compra.findUnique({ where: { id }, select: { status: true, asaasPaymentId: true, sandbox: true } });
  if (!compra?.asaasPaymentId) return NextResponse.json({ error: "Compra não encontrada" }, { status: 404 });
  if (compra.status !== "PAGO") return NextResponse.json({ error: "Só compras pagas podem ser reembolsadas" }, { status: 400 });
  const conta = contaAsaasPlataforma(compra.sandbox);
  if (!conta) return NextResponse.json({ error: "Conta Asaas não configurada" }, { status: 503 });

  try {
    await refundAsaasPayment(conta.apiKey, conta.sandbox, compra.asaasPaymentId);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "O Asaas recusou o estorno" }, { status: 502 });
  }
  const status = await sincronizarCompra(id);
  return NextResponse.json({ status });
}
