import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFollowupMessage } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";

function hoursFromNow(n: number) {
  const d = new Date();
  d.setHours(d.getHours() + n);
  return d;
}

// Disparado por um scheduler externo (crontab/cron-job.org) com:
// Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configs = await prisma.agentConfig.findMany({
    where: { active: true, followupEnabled: true, uazapiToken: { not: null } },
  });

  let sent = 0;
  let checked = 0;

  for (const config of configs) {
    const delays = config.followupDelaysMinutes as unknown as number[];
    if (!Array.isArray(delays) || delays.length === 0) continue;

    const candidates = await prisma.conversation.findMany({
      where: {
        agentConfigId: config.id,
        humanTakeover: false,
        status: { not: "FINALIZADO" },
        followupCount: { lt: delays.length },
      },
      include: { messages: { where: { role: { not: "note" } }, orderBy: { createdAt: "desc" }, take: 20 } },
    });

    for (const conversation of candidates) {
      // A 1ª tentativa conta a partir da última atividade da conversa; as seguintes contam
      // a partir do envio da tentativa anterior, permitindo intervalos diferentes entre elas.
      const referenceTime = conversation.followupCount === 0 ? conversation.updatedAt : (conversation.lastFollowupAt ?? conversation.updatedAt);
      const delayMinutes = delays[conversation.followupCount];
      const dueAt = new Date(referenceTime.getTime() + delayMinutes * 60000);
      if (dueAt > new Date()) continue;

      checked++;
      const lastMessage = conversation.messages[0];
      // Só faz follow-up se a última mensagem foi nossa (estamos esperando o cliente responder)
      if (!lastMessage || lastMessage.role === "user") continue;
      if (!config.systemPrompt || !config.uazapiToken) continue;

      const history = conversation.messages
        .slice()
        .reverse()
        .map(m => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), content: m.content }));

      const followup = await generateFollowupMessage(config.systemPrompt, history, conversation.followupCount + 1);
      if (!followup) continue;

      await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: followup } });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { followupCount: { increment: 1 }, lastFollowupAt: new Date() },
      });
      await sendWhatsAppTextAsTeam(config.uazapiToken, conversation.contactNumber, followup);
      sent++;
    }
  }

  // Lembretes de confirmação de agendamento
  let remindersChecked = 0;
  let remindersSent = 0;

  const schedulingConfigs = await prisma.agentConfig.findMany({
    where: { active: true, schedulingEnabled: true, uazapiToken: { not: null } },
  });

  for (const config of schedulingConfigs) {
    if (!config.uazapiToken) continue;

    const dueAppointments = await prisma.appointment.findMany({
      where: {
        agentConfigId: config.id,
        status: "CONFIRMADO",
        reminderSentAt: null,
        scheduledAt: { gt: new Date(), lte: hoursFromNow(config.appointmentReminderHours) },
      },
    });

    for (const appointment of dueAppointments) {
      remindersChecked++;
      const dateStr = appointment.scheduledAt.toLocaleDateString("pt-BR");
      const timeStr = appointment.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const message = `Olá! Passando para confirmar seu agendamento de ${dateStr} às ${timeStr}. Você confirma presença?`;

      if (appointment.conversationId) {
        await prisma.message.create({ data: { conversationId: appointment.conversationId, role: "assistant", content: message } });
      }
      await prisma.appointment.update({ where: { id: appointment.id }, data: { reminderSentAt: new Date() } });
      await sendWhatsAppTextAsTeam(config.uazapiToken, appointment.contactNumber, message);
      remindersSent++;
    }
  }

  return NextResponse.json({ ok: true, checked, sent, remindersChecked, remindersSent });
}
