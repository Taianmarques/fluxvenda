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
  if (!paymentId) return NextResponse.json({ ok: true });

  if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    const order = await prisma.order.findFirst({ where: { agentConfigId: agentId, asaasPaymentId: paymentId } });
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
