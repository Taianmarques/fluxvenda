import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { notifyOrderWebhook } from "@/lib/order-webhook";
import { confirmAppointmentAndNotify } from "@/lib/appointment-notify";
import { notifyUsers } from "@/lib/onesignal";
import { isSlotAvailable, resolveAvailability, busyStatusWhere, type AvailabilityRule } from "@/lib/scheduling";

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
      notifyOrderWebhook(agentId, order.id, "order.paid");
      if (config.uazapiToken) {
        await sendWhatsAppTextAsTeam(
          config.uazapiToken,
          order.contactNumber,
          `Pagamento confirmado! Seu pedido já está em preparo.`
        ).catch(() => {});
      }
    }

    // Sinal de agendamento (página pública): confirma a reserva quando o Pix cai.
    // Se o pagamento chegou depois da reserva expirar (CANCELADO) e o horário ainda
    // estiver livre, reconfirma; se alguém já tomou o horário, mantém cancelado e
    // avisa o gestor pra estornar manualmente no Asaas.
    const appointment = await prisma.appointment.findFirst({
      where: { agentConfigId: agentId, asaasPaymentId: paymentId },
      include: { professional: true },
    });
    if (appointment && appointment.status !== "CONFIRMADO") {
      const busy = await prisma.appointment.findMany({
        where: {
          agentConfigId: agentId,
          id: { not: appointment.id },
          ...busyStatusWhere(),
          ...(appointment.professionalId ? { professionalId: appointment.professionalId } : {}),
        },
        select: { scheduledAt: true, durationMinutes: true },
      });
      const availability = resolveAvailability(
        config.availability as unknown as AvailabilityRule[],
        appointment.professional?.availability as unknown as AvailabilityRule[] | undefined,
      );
      // Pagamento pode chegar depois do horário-limite normal — o que importa aqui é só
      // conflito com outros agendamentos, então past-check não se aplica: usa a data direto
      const slotLivre = appointment.scheduledAt > new Date() && isSlotAvailable(
        availability,
        appointment.durationMinutes,
        busy,
        appointment.scheduledAt,
        config.agendarAteEncerramento,
        appointment.professionalId ? 1 : config.vagasSimultaneas,
      );

      if (slotLivre) {
        await confirmAppointmentAndNotify(appointment.id);
      } else {
        await prisma.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELADO" } });
        prisma.team.findUnique({ where: { id: config.teamId }, select: { managerId: true } })
          .then(team => team && notifyUsers(
            [team.managerId],
            "Sinal pago, mas horário perdido",
            `${appointment.contactName ?? appointment.contactNumber} pagou o sinal após a reserva expirar e o horário já foi ocupado — estorne o Pix manualmente no Asaas.`,
            `${process.env.NEXT_PUBLIC_APP_URL}/crm/${agentId}/agenda`,
          ))
          .catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true });
}
