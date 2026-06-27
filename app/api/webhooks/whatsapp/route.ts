import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgent, runAgentWithImage, runAgentWithTools, transcribeAudio, classifyLeadQualified, SCHEDULING_TOOLS } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam, downloadMessageMedia } from "@/lib/whatsapp";
import { getAvailableSlots, isSlotAvailable, formatSlotsForAgent, type AvailabilityRule } from "@/lib/scheduling";
import { assignNextAttendant } from "@/lib/assignment";

function mediaMimetype(message: any): string | null {
  return typeof message?.content === "object" && typeof message.content?.mimetype === "string"
    ? message.content.mimetype
    : null;
}

async function buildSchedulingContext(agentConfigId: string): Promise<string> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR");
  const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const [services, professionals] = await Promise.all([
    prisma.service.findMany({ where: { agentConfigId, active: true }, select: { name: true } }),
    prisma.professional.findMany({ where: { agentConfigId, active: true }, select: { name: true } }),
  ]);

  const selectionNote = services.length > 0 || professionals.length > 0
    ? `Essa empresa trabalha com ${services.length > 0 ? "serviços específicos" : ""}${services.length > 0 && professionals.length > 0 ? " e " : ""}${professionals.length > 0 ? "profissionais específicos" : ""}. Use listar_servicos_profissionais para saber as opções e pergunte ao cliente qual ele quer ANTES de consultar horários. Depois, passe o nome escolhido nos parâmetros "service"/"professional" das ferramentas de agendamento.`
    : `Essa empresa não trabalha com serviços ou profissionais específicos — não chame listar_servicos_profissionais.`;

  return `\n\nFERRAMENTAS DE AGENDAMENTO:
Hoje é ${dateStr} (${weekday}), agora são ${timeStr}. ${selectionNote}

Quando o cliente quiser agendar algo:
- Pergunte primeiro o dia e período (manhã/tarde/noite) de preferência, se ele não tiver dito.
- Use a ferramenta consultar_horarios_disponiveis para saber os horários reais — nunca invente ou suponha horários livres.
- NUNCA liste todos os horários disponíveis de uma vez. Escolha no máximo 2 ou 3 opções relevantes (próximas ao que o cliente pediu) e ofereça de forma curta e natural, como faria pelo WhatsApp.
- Depois que o cliente escolher um horário, use agendar_horario para confirmar. Só diga que o agendamento foi confirmado depois que essa ferramenta retornar sucesso.

Você também pode receber, no meio da conversa, um lembrete automático perguntando se o cliente confirma presença num agendamento já marcado:
- Se o cliente confirmar (ex: "sim", "confirmado", "pode contar comigo"), apenas agradeça brevemente, sem chamar nenhuma ferramenta.
- Se ele disser que não pode ir ou quer cancelar, use cancelar_agendamento e, na mesma resposta, já ofereça reagendar — pergunte o novo dia/período de preferência (ou, se ele já tiver dito, use consultar_horarios_disponiveis e siga o fluxo normal de agendamento).`;
}

function makeExecuteTool(agentConfigId: string, conversationId: string, contactName: string | undefined, contactNumber: string) {
  async function resolveProfessional(name?: string) {
    if (!name) return null;
    return prisma.professional.findFirst({ where: { agentConfigId, active: true, name: { equals: name, mode: "insensitive" } } });
  }
  async function resolveService(name?: string) {
    if (!name) return null;
    return prisma.service.findFirst({ where: { agentConfigId, active: true, name: { equals: name, mode: "insensitive" } } });
  }

  return async function executeTool(name: string, args: any): Promise<string> {
    const config = await prisma.agentConfig.findUnique({ where: { id: agentConfigId } });
    if (!config) return "Erro interno: configuração do agente não encontrada.";

    if (name === "listar_servicos_profissionais") {
      const [services, professionals] = await Promise.all([
        prisma.service.findMany({ where: { agentConfigId, active: true }, select: { name: true } }),
        prisma.professional.findMany({ where: { agentConfigId, active: true }, select: { name: true } }),
      ]);
      const parts: string[] = [];
      if (services.length > 0) parts.push(`Serviços: ${services.map(s => s.name).join(", ")}`);
      if (professionals.length > 0) parts.push(`Profissionais: ${professionals.map(p => p.name).join(", ")}`);
      return parts.length > 0 ? parts.join("\n") : "Essa empresa não tem serviços ou profissionais cadastrados.";
    }

    if (name === "consultar_horarios_disponiveis") {
      const professional = await resolveProfessional(args?.professional);
      const service = await resolveService(args?.service);

      // Memoriza a escolha do cliente nessa conversa, pra usar como fallback se o modelo
      // não repetir o parâmetro service/professional na chamada de agendar_horario.
      if (professional || service) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { ...(professional && { pendingProfessionalId: professional.id }), ...(service && { pendingServiceId: service.id }) },
        });
      }

      const availability = (professional?.availability ?? config.availability) as unknown as AvailabilityRule[];
      const slotDuration = service?.durationMinutes ?? config.slotDurationMinutes;

      const busy = await prisma.appointment.findMany({
        where: { agentConfigId, status: "CONFIRMADO", ...(professional ? { professionalId: professional.id } : {}) },
        select: { scheduledAt: true, durationMinutes: true },
      });
      const slots = getAvailableSlots(availability, slotDuration, busy);
      return formatSlotsForAgent(slots);
    }

    if (name === "agendar_horario") {
      const { date, time, notes } = args;
      if (!date || !time) return "Erro: data e horário são obrigatórios.";

      const scheduledAt = new Date(`${date}T${time}:00`);
      if (isNaN(scheduledAt.getTime())) return "Erro: data ou horário em formato inválido.";

      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
      const professional = (await resolveProfessional(args?.professional))
        ?? (conversation?.pendingProfessionalId ? await prisma.professional.findUnique({ where: { id: conversation.pendingProfessionalId } }) : null);
      const service = (await resolveService(args?.service))
        ?? (conversation?.pendingServiceId ? await prisma.service.findUnique({ where: { id: conversation.pendingServiceId } }) : null);

      const availability = (professional?.availability ?? config.availability) as unknown as AvailabilityRule[];
      const slotDuration = service?.durationMinutes ?? config.slotDurationMinutes;

      const busy = await prisma.appointment.findMany({
        where: { agentConfigId, status: "CONFIRMADO", ...(professional ? { professionalId: professional.id } : {}) },
        select: { scheduledAt: true, durationMinutes: true },
      });

      const available = isSlotAvailable(availability, slotDuration, busy, scheduledAt);
      if (!available) return "Esse horário não está mais disponível. Consulte os horários disponíveis novamente e ofereça outra opção ao cliente.";

      await prisma.appointment.create({
        data: {
          agentConfigId, conversationId, contactName, contactNumber,
          scheduledAt, durationMinutes: slotDuration, notes: notes ?? "",
          professionalId: professional?.id, serviceId: service?.id,
        },
      });
      await prisma.conversation.update({ where: { id: conversationId }, data: { pendingProfessionalId: null, pendingServiceId: null } });

      return `Agendamento confirmado para ${date} às ${time}.`;
    }

    if (name === "cancelar_agendamento") {
      const next = await prisma.appointment.findFirst({
        where: { conversationId, status: "CONFIRMADO", scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
      });
      if (!next) return "Não encontrei nenhum agendamento confirmado para cancelar.";

      await prisma.appointment.update({ where: { id: next.id }, data: { status: "CANCELADO" } });
      return "Agendamento cancelado com sucesso.";
    }

    return "Ferramenta desconhecida.";
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  if (body.EventType !== "messages") return NextResponse.json({ ok: true });

  const message = body.message;
  const token: string | undefined = body.token;

  // Ignora eco de mensagens enviadas pela própria API, mensagens de grupo ou payloads incompletos
  if (!message || !token || message.fromMe || message.wasSentByApi || message.isGroup) {
    return NextResponse.json({ ok: true });
  }

  const config = await prisma.agentConfig.findFirst({ where: { uazapiToken: token, active: true } });
  if (!config || !config.systemPrompt || !config.uazapiToken) {
    return NextResponse.json({ ok: true });
  }

  const caption: string = typeof message.text === "string" && message.text
    ? message.text
    : (typeof message.content === "string" ? message.content : "");

  const mimetype = mediaMimetype(message);
  let imageUrl: string | null = null;
  let text = caption;
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;

  if (!caption && mimetype?.startsWith("audio/")) {
    try {
      const media = await downloadMessageMedia(config.uazapiToken, message.id || message.messageid);
      text = await transcribeAudio(media.fileURL, media.mimetype);
      mediaUrl = media.fileURL;
      mediaType = "audio";
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao transcrever áudio:", err);
    }
  } else if (mimetype?.startsWith("image/")) {
    try {
      const media = await downloadMessageMedia(config.uazapiToken, message.id || message.messageid);
      imageUrl = media.fileURL;
      mediaUrl = media.fileURL;
      mediaType = "image";
      text = caption ? `[Imagem] ${caption}` : "[Imagem enviada pelo cliente]";
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao baixar imagem:", err);
    }
  }

  if (!text) return NextResponse.json({ ok: true });

  const contactNumber: string = String(message.sender_pn || message.chatid).split("@")[0];
  const contactName: string | undefined = message.senderName || body.chat?.wa_contactName || body.chat?.name;

  // Cliente respondeu — zera o contador de follow-up
  const conversation = await prisma.conversation.upsert({
    where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber } },
    update: { status: "ATIVO", followupCount: 0, ...(contactName && { contactName }) },
    create: {
      agentConfigId: config.id, contactNumber, contactName, status: "ATIVO",
      stageId: (await prisma.pipelineStage.findFirst({
        where: { pipeline: { agentConfigId: config.id } },
        orderBy: [{ pipeline: { order: "asc" } }, { order: "asc" }],
      }))?.id,
    },
  });

  // Notas internas nunca entram no contexto da IA nem são contadas aqui — são só pra equipe ver
  const recentMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id, role: { not: "note" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const history = recentMessages.reverse();

  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: text, mediaUrl, mediaType } });

  // Conversa nova + rodízio ativo: já nasce atribuída a um atendente, em ordem
  const isNewConversation = conversation.createdAt.getTime() === conversation.updatedAt.getTime();
  if (isNewConversation && config.leadDistributionMode === "RODIZIO") {
    await assignNextAttendant(config.id, config.teamId, conversation.id);
  }

  // Atendente humano assumiu essa conversa — apenas registra a mensagem, sem o agente responder
  if (conversation.humanTakeover) {
    return NextResponse.json({ ok: true });
  }

  // Mensagens do atendente humano entram como "assistant" para o agente manter o contexto
  // de tudo que já foi dito pela empresa, mesmo no período em que esteve em atendimento manual.
  const historyForAgent = history.map(m => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.content }));

  let reply: string;
  if (imageUrl) {
    reply = await runAgentWithImage(config.systemPrompt, historyForAgent, imageUrl, caption);
  } else if (config.schedulingEnabled) {
    reply = await runAgentWithTools(
      config.systemPrompt + await buildSchedulingContext(config.id),
      historyForAgent,
      text,
      SCHEDULING_TOOLS,
      makeExecuteTool(config.id, conversation.id, contactName, contactNumber)
    );
  } else {
    reply = await runAgent(config.systemPrompt, historyForAgent, text);
  }

  await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } });

  // IA decide quando o lead está qualificado e atribui a um atendente (rodízio), se ainda não tiver dono
  if (config.leadDistributionMode === "IA_QUALIFICACAO" && !conversation.assignedToId) {
    try {
      const qualified = await classifyLeadQualified([...historyForAgent, { role: "user", content: text }, { role: "assistant", content: reply }]);
      if (qualified) await assignNextAttendant(config.id, config.teamId, conversation.id);
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao classificar qualificação do lead:", err);
    }
  }

  await sendWhatsAppTextAsTeam(config.uazapiToken, contactNumber, reply);

  return NextResponse.json({ ok: true });
}
