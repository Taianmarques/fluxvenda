import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";

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
