import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";

// Webhook de confirmação de pagamento do Asaas, um por agente (a URL já escopa o tenant).
// Autenticidade validada pelo token estático que o gestor configura no painel do Asaas
// como valor do header "asaas-access-token" — não é assinatura HMAC.
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const config = await prisma.agentConfig.findUnique({ where: { id: agentId } });
  if (!config?.asaasWebhookToken) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const token = req.headers.get("asaas-access-token");
  if (token !== config.asaasWebhookToken) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const event = body?.event as string | undefined;
  const paymentId = body?.payment?.id as string | undefined;
  const installmentId = body?.payment?.installment as string | undefined;
  if (!paymentId) return NextResponse.json({ ok: true });

  if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    // Pra cobrança parcelada, cada parcela paga gera um payment.id diferente do que guardamos
    // (o da 1ª parcela) — por isso também casamos pelo id do plano de parcelas (installment).
    // Simplificação: marca o pedido como PAGO já na 1ª parcela confirmada, sem rastrear parcela a parcela.
    const order = await prisma.order.findFirst({
      where: { agentConfigId: agentId, OR: [{ asaasPaymentId: paymentId }, ...(installmentId ? [{ asaasInstallmentId: installmentId }] : [])] },
    });
    if (order && order.status !== "PAGO") {
      await prisma.order.update({ where: { id: order.id }, data: { status: "PAGO", paidAt: new Date() } });
      if (config.uazapiToken) {
        await sendWhatsAppTextAsTeam(
          config.uazapiToken,
          order.contactNumber,
          `Pagamento confirmado! Seu pedido já está em preparo.`
        ).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true });
}
