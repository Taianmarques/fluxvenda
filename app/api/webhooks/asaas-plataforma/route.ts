import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Webhook da conta Asaas DA PRÓPRIA PLATAFORMA (créditos de IA) — diferente do webhook por
// agente em /api/webhooks/asaas/[agentId], que é da conta de cada cliente. Autenticidade
// validada pelo token estático configurado no painel Asaas como header "asaas-access-token".
export async function POST(req: NextRequest) {
  const expectedToken = process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN;
  if (!expectedToken) return NextResponse.json({ ok: true }); // não configurado ainda — ignora

  const token = req.headers.get("asaas-access-token");
  if (token !== expectedToken) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const event = body?.event as string | undefined;
  const paymentId = body?.payment?.id as string | undefined;
  if (!paymentId) return NextResponse.json({ ok: true });

  if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    const compra = await prisma.creditoCompra.findUnique({ where: { asaasPaymentId: paymentId } });
    if (compra && compra.status !== "PAGO") {
      await prisma.$transaction([
        prisma.creditoCompra.update({ where: { id: compra.id }, data: { status: "PAGO" } }),
        prisma.team.update({ where: { id: compra.teamId }, data: { aiCreditsBalance: { increment: compra.tokens } } }),
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
