import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { sendWhatsAppTextAsTeam, sendMediaAsTeam, downloadMessageMedia } from "@/lib/whatsapp";
import { sendInstagramDM } from "@/lib/instagram";
import { emitChatEvent } from "@/lib/realtime";
import { z } from "zod";

async function runQuickReplyAutomation(agentConfigId: string, conversationId: string, content: string | undefined) {
  const texto = content?.trim();
  if (!texto) return;

  const automacoes = await prisma.automacao.findMany({
    where: { agentConfigId, active: true, trigger: "QUICK_REPLY" },
    include: { quickReply: { select: { content: true, title: true } }, targetStage: { select: { id: true, name: true } } },
  });
  const match = automacoes.find(a => a.quickReply.content.trim() === texto);
  if (!match) return;

  // Move a oportunidade aberta (ou cria uma) para a etapa alvo
  const opp = await prisma.opportunity.findFirst({
    where: { conversationId, wonAt: null },
    orderBy: { createdAt: "desc" },
    include: { stage: { select: { name: true } } },
  });

  if (opp?.stageId === match.targetStage.id) return; // já está lá

  if (opp) {
    await prisma.opportunity.update({
      where: { id: opp.id },
      data: { stageId: match.targetStage.id, stageEnteredAt: new Date() },
    });
  } else {
    await prisma.opportunity.create({
      data: { conversationId, stageId: match.targetStage.id, stageEnteredAt: new Date(), dealValue: 0 },
    });
  }

  await prisma.message.create({
    data: {
      conversationId,
      role: "note",
      content: `Automação "${match.nome}": lead movido para a etapa "${match.targetStage.name}"${opp?.stage ? ` (antes: "${opp.stage.name}")` : " (entrou no funil)"} pela mensagem rápida "${match.quickReply.title}".`,
    },
  });
  emitChatEvent(agentConfigId, conversationId);
}

const schema = z.object({
  content: z.string().optional(),
  media: z.object({
    base64: z.string().min(1),
    type: z.enum(["image", "video", "audio", "document"]),
    fileName: z.string().optional(),
  }).optional(),
  replyToMessageId: z.string().optional(), // responder citando (estilo WhatsApp)
}).refine(d => d.content || d.media, { message: "content ou media é obrigatório" });

// Envia uma mensagem (texto e/ou mídia) como atendente humano — assume a conversa e pausa o agente de IA
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  if (!(await userBelongsToAgentConfig(userId, conversation.agentConfigId))) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const config = await prisma.agentConfig.findUnique({ where: { id: conversation.agentConfigId } });
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const isInstagram = conversation.contactNumber.startsWith("ig_");
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;
  let content = body.data.content ?? "";
  const captionText = content; // preserva o texto original digitado — `content` vira o placeholder da mídia mais abaixo

  // Mensagem citada — guard de conversa impede citar mensagem de outro chat. Sem waMessageId
  // (mensagens antigas), a citação sai só no CRM: envia sem replyid, mas grava replyToId.
  const replyTarget = body.data.replyToMessageId
    ? await prisma.message.findFirst({ where: { id: body.data.replyToMessageId, conversationId: id } })
    : null;
  const replyId = replyTarget?.waMessageId ?? undefined;
  let waMessageId: string | null = null;
  let captionWaMessageId: string | null = null; // legenda enviada como texto separado, quando há mídia + texto

  if (isInstagram) {
    if (!content) return NextResponse.json({ error: "Instagram DM só suporta texto" }, { status: 400 });
    const igConn = await prisma.instagramConnection.findUnique({ where: { agentConfigId: conversation.agentConfigId } });
    if (!igConn) return NextResponse.json({ error: "Conexão Instagram não encontrada" }, { status: 404 });
    const senderIgsid = conversation.contactNumber.replace("ig_", "");
    await sendInstagramDM(igConn.instagramBusinessAccountId, igConn.pageAccessToken, senderIgsid, content);
  } else {
    if (!config.uazapiToken) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

    // Assinatura sai só no texto enviado pro cliente pelo WhatsApp
    let signaturePrefix = "";
    if (config.signatureEnabled) {
      const sender = await prisma.profile.findUnique({ where: { id: userId }, select: { name: true } });
      if (sender?.name) signaturePrefix = `*${sender.name}:*\n`;
    }

    if (body.data.media) {
      const { base64, type, fileName } = body.data.media;
      let sent;
      try {
        // Legenda NÃO vai no campo "caption" da mídia — a UazAPI às vezes aceita na requisição
        // mas não entrega ela no WhatsApp do cliente (só a foto chega). Manda como mensagem de
        // texto separada logo abaixo, pra garantir a entrega mesmo quando o caption é ignorado.
        sent = await sendMediaAsTeam(config.uazapiToken, conversation.contactNumber, type, base64, {
          fileName,
          replyId,
          isGroup: conversation.isGroup,
        });
      } catch (err) {
        console.error("[mensagem] erro ao enviar mídia:", err);
        return NextResponse.json({ error: "Não foi possível enviar a mídia" }, { status: 502 });
      }
      waMessageId = sent.messageid ?? null;

      try {
        const media = await downloadMessageMedia(config.uazapiToken, sent.messageid);
        mediaUrl = media.fileURL;
        mediaType = type;
      } catch (err) {
        console.error("[mensagem] erro ao obter url da mídia enviada:", err);
      }

      if (captionText.trim()) {
        captionWaMessageId = await sendWhatsAppTextAsTeam(config.uazapiToken, conversation.contactNumber, `${signaturePrefix}${captionText}`, undefined, conversation.isGroup);
        if (!captionWaMessageId) console.error("[mensagem] falha ao enviar legenda como texto separado — a foto já foi enviada");
      }
      content = fileName ? `[${type}] ${fileName}` : `[${type}]`;
    } else {
      waMessageId = await sendWhatsAppTextAsTeam(config.uazapiToken, conversation.contactNumber, `${signaturePrefix}${content}`, replyId, conversation.isGroup);
    }
  }

  const message = await prisma.message.create({
    data: { conversationId: id, role: "human", content, mediaUrl, mediaType, senderId: userId, waMessageId, replyToId: replyTarget?.id ?? null },
  });
  // A legenda vira uma segunda mensagem no histórico, refletindo exatamente o que o cliente
  // recebeu de verdade (duas mensagens), em vez de fingir que foi uma única com caption.
  if (captionWaMessageId) {
    await prisma.message.create({
      data: { conversationId: id, role: "human", content: captionText, senderId: userId, waMessageId: captionWaMessageId },
    });
  }
  emitChatEvent(conversation.agentConfigId, id); // outros atendentes veem na hora

  // Automação por mensagem rápida: se o texto enviado é o conteúdo de uma resposta rápida
  // vinculada a uma automação ativa, move o lead para a etapa configurada (sem IA)
  runQuickReplyAutomation(conversation.agentConfigId, id, captionText).catch(err =>
    console.warn("[automacao] quick reply:", err?.message ?? err)
  );

  await prisma.conversation.update({
    where: { id },
    data: {
      humanTakeover: true,
      status: "ATIVO",
      // "Primeiro a assumir": quem manda a primeira mensagem manual fica responsável pela conversa
      ...(config.leadDistributionMode === "PRIMEIRO_A_ASSUMIR" && !conversation.assignedToId && { assignedToId: userId }),
    },
  });

  return NextResponse.json({ message });
}
