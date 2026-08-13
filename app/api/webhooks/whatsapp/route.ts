// Webhook da UazAPI — só faz o parsing do payload específico da UazAPI e delega o
// atendimento (IA, ferramentas, envio final) para o pipeline compartilhado em lib/whatsapp-inbound.ts.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transcribeAudio } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam, sendMediaAsTeam, downloadMessageMedia } from "@/lib/whatsapp";
import { processIncomingMessage, type ChannelAdapter } from "@/lib/whatsapp-inbound";

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

  // Ignora eco de mensagens enviadas pela própria API ou payloads incompletos. Mensagem de
  // grupo passa — vira uma conversa própria (aba Grupos no CRM), só que a IA nunca responde
  // nela automaticamente (ver shouldAiHandle em lib/whatsapp-inbound.ts).
  if (!message || !token || message.fromMe || message.wasSentByApi) {
    return NextResponse.json({ ok: true });
  }
  const isGroup = Boolean(message.isGroup);

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
      // Sem prefixo "[Imagem] " na legenda de verdade — a UI trata qualquer content começando
      // com "[" como texto genérico (sem legenda) e não mostra, então a legenda real sumia.
      text = caption || "[Imagem enviada pelo cliente]";
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao baixar imagem:", err);
    }
  } else if (mimetype?.startsWith("video/")) {
    try {
      const media = await downloadMessageMedia(config.uazapiToken, message.id || message.messageid);
      mediaUrl = media.fileURL;
      mediaType = "video";
      text = caption || "[Vídeo enviado pelo cliente]";
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao baixar vídeo:", err);
    }
  } else if (mimetype) {
    // Qualquer outro mimetype com mídia anexada (PDF, docx, xlsx, etc.) — sem isso a mensagem
    // ficava sem texto e era descartada silenciosamente pelo "if (!text) return" logo abaixo.
    try {
      const media = await downloadMessageMedia(config.uazapiToken, message.id || message.messageid);
      mediaUrl = media.fileURL;
      mediaType = "document";
      text = caption || "[Documento enviado pelo cliente]";
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao baixar documento:", err);
    }
  }

  if (!text) return NextResponse.json({ ok: true });

  // Grupo: a "conversa" é o grupo em si (chatid), não quem mandou a mensagem — sender_pn
  // trocaria de pessoa a cada mensagem e criaria uma conversa por participante, errado.
  // Nome do grupo: campo exato varia por versão da UazAPI (extração defensiva, igual ao
  // quoted abaixo) — cai pro próprio número do grupo se nenhum vier preenchido.
  const contactNumber: string = isGroup
    ? String(message.chatid).split("@")[0]
    : String(message.sender_pn || message.chatid).split("@")[0];
  const contactName: string | undefined = isGroup
    ? (body.chat?.name || message.chat?.name || body.chat?.wa_contactName || contactNumber)
    : (message.senderName || body.chat?.wa_contactName || body.chat?.name);
  // Quem mandou essa mensagem específica dentro do grupo — cada mensagem pode ser de uma
  // pessoa diferente, ao contrário do 1-pra-1 onde contactName já identifica o remetente.
  const groupSenderName: string | undefined = isGroup ? message.senderName : undefined;

  // Id da mensagem no provedor + id da mensagem citada (quando o cliente responde citando).
  // Os campos do quoted variam por versão da UazAPI — extração defensiva.
  const waMessageId: string | null = message.id || message.messageid || null;
  const quotedWaMessageId: string | null =
    message.quoted?.id ?? message.quoted?.messageid ?? (typeof message.quoted === "string" ? message.quoted : null)
    ?? message.quotedMsgId ?? message.reply_id ?? message.replyid
    ?? message.content?.contextInfo?.stanzaId ?? null;

  const uazapiToken = config.uazapiToken;
  const adapter: ChannelAdapter = {
    sendText: (phone, t) => sendWhatsAppTextAsTeam(uazapiToken, phone, t),
    // "audio" vira "myaudio" na UazAPI — é o que faz a mensagem sair como nota de voz nativa,
    // em vez de anexo encaminhado (ver lib/whatsapp.ts MediaType).
    sendMedia: async (phone, type, base64, opts) => (await sendMediaAsTeam(uazapiToken, phone, type === "audio" ? "myaudio" : type, base64, opts))?.messageid ?? null,
  };

  await processIncomingMessage(config, { text, caption, contactNumber, contactName, mediaUrl, mediaType, imageUrl, waMessageId, quotedWaMessageId, isGroup, groupSenderName }, adapter);

  return NextResponse.json({ ok: true });
}
