import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { notifyUsers } from "@/lib/onesignal";

// Avisa o profissional no WhatsApp quando um agendamento é criado ou cancelado.
// Fire-and-forget: os callers não devem await — falha aqui nunca quebra o atendimento.
export async function notifyProfessionalOfAppointment(
  appointmentId: string,
  event: "novo" | "cancelado"
): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        professional: true,
        service: true,
        agentConfig: { select: { uazapiToken: true } },
      },
    });
    if (!appointment?.professional?.phone) return;
    if (!appointment.agentConfig.uazapiToken) return;

    const quando = appointment.scheduledAt.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const cliente = appointment.contactName || appointment.contactNumber;
    const servico = appointment.service ? ` — ${appointment.service.name}` : "";
    const obs = appointment.notes ? `\nObs: ${appointment.notes}` : "";

    const text =
      event === "novo"
        ? `Novo agendamento${servico}\nCliente: ${cliente} (${appointment.contactNumber})\nQuando: ${quando}${obs}`
        : `Agendamento CANCELADO${servico}\nCliente: ${cliente} (${appointment.contactNumber})\nEra: ${quando}`;

    await sendWhatsAppTextAsTeam(appointment.agentConfig.uazapiToken, appointment.professional.phone, text);
  } catch (err: any) {
    console.warn(`[appointment-notify] ${event} ${appointmentId}:`, err?.message ?? err);
  }
}

// Confirma uma reserva paga (sinal via Asaas) e dispara as notificações que o fluxo de
// agendamento sem cobrança faria na hora: profissional, gestor (push) e cliente (WhatsApp).
// Usado pelo webhook do Asaas quando o pagamento do sinal é confirmado.
export async function confirmAppointmentAndNotify(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CONFIRMADO" },
    include: {
      professional: { select: { name: true } },
      service: { select: { name: true } },
      agentConfig: { select: { id: true, teamId: true, uazapiToken: true } },
    },
  });

  notifyProfessionalOfAppointment(appointment.id, "novo");

  const quando = appointment.scheduledAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " às " + appointment.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  prisma.team.findUnique({ where: { id: appointment.agentConfig.teamId }, select: { managerId: true } })
    .then(team => {
      if (!team) return;
      return notifyUsers(
        [team.managerId],
        "Agendamento confirmado (sinal pago)",
        `${appointment.contactName ?? appointment.contactNumber} — ${appointment.service ? `${appointment.service.name} ` : ""}em ${quando}${appointment.professional ? ` com ${appointment.professional.name}` : ""}`,
        `${process.env.NEXT_PUBLIC_APP_URL}/crm/${appointment.agentConfig.id}/agenda`,
      );
    })
    .catch(() => {});

  if (appointment.agentConfig.uazapiToken) {
    const texto = `Pagamento confirmado! Seu agendamento${appointment.service ? ` de ${appointment.service.name}` : ""} em ${quando}${appointment.professional ? ` com ${appointment.professional.name}` : ""} está garantido. Até lá!`;
    sendWhatsAppTextAsTeam(appointment.agentConfig.uazapiToken, appointment.contactNumber, texto).catch(() => {});
  }
}
