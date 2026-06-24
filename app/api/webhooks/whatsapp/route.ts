import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgent, runAgentWithImage, transcribeAudio } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam, downloadMessageMedia } from "@/lib/whatsapp";

function mediaMimetype(message: any): string | null {
  return typeof message?.content === "object" && typeof message.content?.mimetype === "string"
    ? message.content.mimetype
    : null;
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
      stageId: (await prisma.pipelineStage.findFirst({ where: { agentConfigId: config.id }, orderBy: { order: "asc" } }))?.id,
    },
  });

  const recentMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const history = recentMessages.reverse();

  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: text, mediaUrl, mediaType } });

  // Atendente humano assumiu essa conversa — apenas registra a mensagem, sem o agente responder
  if (conversation.humanTakeover) {
    return NextResponse.json({ ok: true });
  }

  // Mensagens do atendente humano entram como "assistant" para o agente manter o contexto
  // de tudo que já foi dito pela empresa, mesmo no período em que esteve em atendimento manual.
  const historyForAgent = history.map(m => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.content }));

  const reply = imageUrl
    ? await runAgentWithImage(config.systemPrompt, historyForAgent, imageUrl, caption)
    : await runAgent(config.systemPrompt, historyForAgent, text);

  await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } });

  await sendWhatsAppTextAsTeam(config.uazapiToken, contactNumber, reply);

  return NextResponse.json({ ok: true });
}
