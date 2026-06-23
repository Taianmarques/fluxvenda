import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgent, transcribeAudio } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam, downloadMessageMedia } from "@/lib/whatsapp";

function isAudioMessage(message: any): boolean {
  return typeof message?.content === "object" && typeof message.content?.mimetype === "string" && message.content.mimetype.startsWith("audio/");
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

  let text: string = typeof message.text === "string" && message.text
    ? message.text
    : (typeof message.content === "string" ? message.content : "");

  if (!text && isAudioMessage(message)) {
    try {
      const messageId = message.id || message.messageid;
      const media = await downloadMessageMedia(config.uazapiToken, messageId);
      text = await transcribeAudio(media.fileURL, media.mimetype);
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao transcrever áudio:", err);
    }
  }

  if (!text) return NextResponse.json({ ok: true });

  const contactNumber: string = String(message.sender_pn || message.chatid).split("@")[0];
  const contactName: string | undefined = message.senderName || body.chat?.wa_contactName || body.chat?.name;

  // Cliente respondeu — zera o contador de follow-up
  const conversation = await prisma.conversation.upsert({
    where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber } },
    update: { status: "ATIVO", followupCount: 0, ...(contactName && { contactName }) },
    create: { agentConfigId: config.id, contactNumber, contactName, status: "ATIVO" },
  });

  const recentMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const history = recentMessages.reverse();

  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: text } });

  // Atendente humano assumiu essa conversa — apenas registra a mensagem, sem o agente responder
  if (conversation.humanTakeover) {
    return NextResponse.json({ ok: true });
  }

  const reply = await runAgent(
    config.systemPrompt,
    // Mensagens do atendente humano entram como "assistant" para o agente manter o contexto
    // de tudo que já foi dito pela empresa, mesmo no período em que esteve em atendimento manual.
    history.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
    text
  );

  await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } });

  await sendWhatsAppTextAsTeam(config.uazapiToken, contactNumber, reply);

  return NextResponse.json({ ok: true });
}
