import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFollowupMessage } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { logTokenUsage } from "@/lib/token-usage";
import { dentroHorarioEnvio } from "@/lib/sending-hours";

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
    if (!dentroHorarioEnvio(config.horarioEnvioInicio, config.horarioEnvioFim)) continue;

    const delays = config.followupDelaysMinutes as unknown as number[];
    if (!Array.isArray(delays) || delays.length === 0) continue;

    const candidates = await prisma.conversation.findMany({
      where: {
        agentConfigId: config.id,
        humanTakeover: false,
        status: { not: "FINALIZADO" },
        followupCount: { lt: delays.length },
        isGroup: false, // IA nunca manda mensagem automática pra grupo
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

      const { reply: followup, usage } = await generateFollowupMessage(config.systemPrompt, history, conversation.followupCount + 1);
      if (!followup) continue;
      logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "followup", ...usage });

      // Envia antes de gravar: sendWhatsAppTextAsTeam não lança em erro de API (só loga e
      // retorna null) — confirmando o envio antes de tocar no banco, uma falha simplesmente
      // deixa o followupCount como está, e o mesmo candidato volta a ser elegível na próxima
      // execução, em vez de a mensagem "existir" no CRM sem nunca ter saído de verdade.
      const sentId = await sendWhatsAppTextAsTeam(config.uazapiToken, conversation.contactNumber, followup);
      if (!sentId) {
        console.error(`[cron/followup] falha ao enviar follow-up da conversa ${conversation.id} — tenta de novo na próxima execução`);
        continue;
      }

      await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: followup } });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { followupCount: { increment: 1 }, lastFollowupAt: new Date() },
      });
      sent++;
    }
  }

  // Follow-up por etapa do pipeline: cutuca oportunidades paradas há muito tempo na mesma
  // etapa, independente de quem mandou a última mensagem (diferente do follow-up de conversa
  // acima, que só dispara enquanto espera resposta do cliente).
  let stageFollowupChecked = 0;
  let stageFollowupSent = 0;

  const stages = await prisma.pipelineStage.findMany({
    where: { pipeline: { agentConfig: { active: true, uazapiToken: { not: null } } } },
    include: { pipeline: { include: { agentConfig: true } } },
  });

  for (const stage of stages) {
    const delays = stage.followupDelaysMinutes as unknown as number[];
    if (!Array.isArray(delays) || delays.length === 0) continue;

    const config = stage.pipeline.agentConfig;
    if (!config.systemPrompt || !config.uazapiToken) continue;
    if (!dentroHorarioEnvio(config.horarioEnvioInicio, config.horarioEnvioFim)) continue;

    const pipelineInstr = stage.pipeline.agenteInstrucoes?.trim();
    const stageInstr = stage.agenteInstrucoes?.trim();
    let stageInstruction = "";
    if (pipelineInstr || stageInstr) {
      stageInstruction = `\n\nAGENTE RESPONSÁVEL PELO FUNIL:
O lead está na etapa "${stage.name}" do funil "${stage.pipeline.name}". Siga estas orientações com PRIORIDADE sobre o comportamento geral:`;
      if (pipelineInstr) stageInstruction += `\n\nOrientações do funil "${stage.pipeline.name}" (valem em todas as etapas):\n${pipelineInstr}`;
      if (stageInstr) stageInstruction += `\n\nOrientações específicas da etapa "${stage.name}" (prioridade máxima):\n${stageInstr}`;
    }

    const candidates = await prisma.opportunity.findMany({
      where: {
        stageId: stage.id,
        wonAt: null,
        lostAt: null,
        stageFollowupCount: { lt: delays.length },
        conversation: { humanTakeover: false, status: { not: "FINALIZADO" }, isGroup: false }, // IA nunca manda mensagem automática pra grupo
      },
      include: { conversation: { include: { messages: { where: { role: { not: "note" } }, orderBy: { createdAt: "desc" }, take: 20 } } } },
    });

    for (const opp of candidates) {
      const referenceTime = opp.stageFollowupCount === 0 ? opp.stageEnteredAt : (opp.lastStageFollowupAt ?? opp.stageEnteredAt);
      const delayMinutes = delays[opp.stageFollowupCount];
      const dueAt = new Date(referenceTime.getTime() + delayMinutes * 60000);
      if (dueAt > new Date()) continue;

      stageFollowupChecked++;
      const conversation = opp.conversation;

      const lastMessage = conversation.messages[0];
      // Só faz follow-up se a última mensagem foi nossa — se o cliente já respondeu, mesmo
      // sem a oportunidade ter avançado de etapa, não faz sentido mandar mensagem por cima.
      if (!lastMessage || lastMessage.role === "user") continue;

      const history = conversation.messages
        .slice()
        .reverse()
        .map(m => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), content: m.content }));

      const { reply: followup, usage } = await generateFollowupMessage(config.systemPrompt + stageInstruction, history, opp.stageFollowupCount + 1);
      if (!followup) continue;
      logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "followup", ...usage });

      const sentId = await sendWhatsAppTextAsTeam(config.uazapiToken, conversation.contactNumber, followup);
      if (!sentId) {
        console.error(`[cron/followup] falha ao enviar follow-up de etapa da oportunidade ${opp.id} — tenta de novo na próxima execução`);
        continue;
      }

      await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: followup } });
      await prisma.opportunity.update({
        where: { id: opp.id },
        data: { stageFollowupCount: { increment: 1 }, lastStageFollowupAt: new Date() },
      });
      stageFollowupSent++;
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

      const sentId = await sendWhatsAppTextAsTeam(config.uazapiToken, appointment.contactNumber, message);
      if (!sentId) {
        console.error(`[cron/followup] falha ao enviar lembrete do agendamento ${appointment.id} — tenta de novo na próxima execução`);
        continue;
      }

      if (appointment.conversationId) {
        await prisma.message.create({ data: { conversationId: appointment.conversationId, role: "assistant", content: message } });
      }
      await prisma.appointment.update({ where: { id: appointment.id }, data: { reminderSentAt: new Date() } });
      remindersSent++;
    }
  }

  // Envios agendados: mensagens de texto que um atendente programou pra sair numa hora futura
  let scheduledChecked = 0;
  let scheduledSent = 0;

  const dueScheduled = await prisma.scheduledMessage.findMany({
    where: { sentAt: null, scheduledFor: { lte: new Date() } },
    include: { conversation: { include: { agentConfig: true } } },
  });

  for (const scheduled of dueScheduled) {
    scheduledChecked++;
    const conversation = scheduled.conversation;
    const config = conversation.agentConfig;
    if (!config.uazapiToken) continue;

    let signaturePrefix = "";
    if (config.signatureEnabled) {
      const sender = await prisma.profile.findUnique({ where: { id: scheduled.createdById }, select: { name: true } });
      if (sender?.name) signaturePrefix = `*${sender.name}:*\n`;
    }

    const sentId = await sendWhatsAppTextAsTeam(config.uazapiToken, conversation.contactNumber, `${signaturePrefix}${scheduled.content}`, undefined, conversation.isGroup);
    if (!sentId) {
      console.error(`[cron/followup] falha ao enviar mensagem agendada ${scheduled.id} — tenta de novo na próxima execução`);
      continue;
    }

    await prisma.message.create({
      data: { conversationId: conversation.id, role: "human", content: scheduled.content, senderId: scheduled.createdById },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        humanTakeover: true,
        status: "ATIVO",
        ...(config.leadDistributionMode === "PRIMEIRO_A_ASSUMIR" && !conversation.assignedToId && { assignedToId: scheduled.createdById }),
      },
    });
    await prisma.scheduledMessage.update({ where: { id: scheduled.id }, data: { sentAt: new Date() } });
    scheduledSent++;
  }

  return NextResponse.json({
    ok: true, checked, sent, stageFollowupChecked, stageFollowupSent,
    remindersChecked, remindersSent, scheduledChecked, scheduledSent,
  });
}
