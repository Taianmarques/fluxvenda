import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

export type OrderWebhookEvent = "order.created" | "order.updated" | "order.paid";

// Notifica o sistema do cliente sobre um pedido (fire-and-forget: os callers não
// devem await nem depender do resultado — falha aqui nunca quebra o atendimento).
export async function notifyOrderWebhook(agentConfigId: string, orderId: string, event: OrderWebhookEvent): Promise<void> {
  try {
    const config = await prisma.agentConfig.findUnique({
      where: { id: agentConfigId },
      select: { orderWebhookUrl: true, orderWebhookSecret: true },
    });
    if (!config?.orderWebhookUrl) return;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const body = JSON.stringify({
      event,
      sentAt: new Date().toISOString(),
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        contactName: order.contactName,
        contactNumber: order.contactNumber,
        paymentUrl: order.asaasInvoiceUrl,
        paidAt: order.paidAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
        })),
      },
    });

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.orderWebhookSecret) {
      headers["X-FluxVenda-Signature"] =
        "sha256=" + createHmac("sha256", config.orderWebhookSecret).update(body).digest("hex");
    }

    const res = await fetch(config.orderWebhookUrl, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[order-webhook] ${event} ${orderId}: destino respondeu ${res.status}`);
    }
  } catch (err: any) {
    console.warn(`[order-webhook] ${event} ${orderId}:`, err?.message ?? err);
  }
}
