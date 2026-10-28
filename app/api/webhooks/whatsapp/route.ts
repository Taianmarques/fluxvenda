// Webhook da UazAPI — só faz o parsing do payload específico da UazAPI e delega o
// atendimento (IA, ferramentas, envio final) para o pipeline compartilhado em lib/whatsapp-inbound.ts.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transcribeAudio } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam, sendMediaAsTeam, downloadMessageMedia } from "@/lib/whatsapp";
import { persistRemoteMedia } from "@/lib/media-store";
import { processIncomingMessage, type ChannelAdapter } from "@/lib/whatsapp-inbound";
import { findConversationByPhone } from "@/lib/conversation-lookup";

function mediaMimetype(message: any): string | null {
  return typeof message?.content === "object" && typeof message.content?.mimetype === "string"
    ? message.content.mimetype
    : null;
}

// Nome do arquivo, quando a mídia é um documento — os campos variam por versão da UazAPI.
function mediaFileName(message: any): string | undefined {
  return message?.content?.fileName ?? message?.content?.filename ?? message?.fileName ?? undefined;
}

// Legenda de foto/vídeo/documento — pra mídia, a UazAPI manda a legenda dentro de
// `content.caption` (não em `message.text`, que fica vazio nesse caso); extração defensiva
// porque o campo varia por versão da API, igual ao quoted e ao fileName acima.
function mediaCaption(message: any): string {
  if (typeof message?.content === "object" && typeof message.content?.caption === "string" && message.content.caption) {
    return message.content.caption;
  }
  return typeof message?.caption === "string" ? message.caption : "";
}

// Resposta dada direto no WhatsApp do número conectado: registra no CRM (pra conversa não ficar
// com buraco) e pausa a IA nessa conversa (humanTakeover, status ATIVO) — é o mesmo efeito de
// "Assumir atendimento" no CRM. Eco do que a própria plataforma enviou não chega aqui
// (wasSentByApi), e o waMessageId repetido é ignorado por garantia.
async function handleMensagemDoCelular(token: string, message: any, body: any) {
  const config = await prisma.agentConfig.findFirst({ where: { uazapiToken: token, active: true }, select: { id: true } });
  if (!config) return;

  // Em mensagem nossa, chatid é o contato; quando vier como @lid, tenta o telefone do chat
  const jid = String(message.chatid ?? "");
  const raw = jid.endsWith("@lid") ? String(body.chat?.phone ?? body.chat?.wa_chatid ?? "") : jid;
  const contactNumber = raw.split("@")[0].replace(/\D/g, "");
  if (!contactNumber) return;

  const waMessageId: string | null = message.id || message.messageid || null;
  const texto: string = (typeof message.text === "string" && message.text)
    || mediaCaption(message)
    || (typeof message.content === "string" ? message.content : "")
    || (mediaMimetype(message) ? "[Mídia enviada pelo WhatsApp do celular]" : "");

  let conversation = await findConversationByPhone(config.id, contactNumber);
  if (conversation) {
    if (waMessageId) {
      const jaTem = await prisma.message.findFirst({ where: { conversationId: conversation.id, waMessageId }, select: { id: true } });
      if (jaTem) return;
    }
    // Rede de segurança contra eco sem wasSentByApi: a IA e os crons salvam sem waMessageId, então
    // se a plataforma acabou de mandar esse mesmo texto (ou uma mídia) aqui, é eco — não pausa
    const semLegenda = !mediaCaption(message) && !(typeof message.text === "string" && message.text);
    const eco = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        role: { in: ["assistant", "human"] },
        createdAt: { gte: new Date(Date.now() - 2 * 60_000) },
        ...(mediaMimetype(message) && semLegenda ? { mediaType: { not: null } } : { content: texto }),
      },
      select: { id: true },
    });
    if (eco) return;
  }

  if (conversation) {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { humanTakeover: true, status: "ATIVO" },
    });
  } else {
    // Primeiro contato puxado pelo celular: a conversa já nasce com atendimento humano
    try {
      conversation = await prisma.conversation.create({
        data: { agentConfigId: config.id, contactNumber, contactName: body.chat?.wa_contactName || body.chat?.name || null, status: "ATIVO", humanTakeover: true },
      });
    } catch (err) {
      if ((err as { code?: string })?.code !== "P2002") throw err;
      conversation = await prisma.conversation.update({
        where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber } },
        data: { humanTakeover: true, status: "ATIVO" },
      });
    }
  }

  if (texto) {
    await prisma.message.create({
      data: { conversationId: conversation.id, role: "human", content: texto, waMessageId },
    });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  if (body.EventType !== "messages") return NextResponse.json({ ok: true });

  const message = body.message;
  const token: string | undefined = body.token;

  // Mensagem enviada pelo WhatsApp do próprio celular (ou WhatsApp Web), não pela plataforma:
  // alguém da equipe assumiu o atendimento na mão — pausa a IA pra esse lead.
  if (message && token && message.fromMe && !message.wasSentByApi && !message.isGroup) {
    await handleMensagemDoCelular(token, message, body);
    return NextResponse.json({ ok: true });
  }

  // Ignora eco de mensagens enviadas pela própria API ou payloads incompletos. Mensagem de
  // grupo passa — vira uma conversa própria (aba Grupos no CRM), só que a IA nunca responde
  // nela automaticamente (ver shouldAiHandle em lib/whatsapp-inbound.ts).
  if (!message || !token || message.fromMe || message.wasSentByApi) {
    return NextResponse.json({ ok: true });
  }
  const isGroup = Boolean(message.isGroup);

  // Conectar o canal não exige ter configurado o agente antes (systemPrompt pode estar
  // vazio) — a mensagem entra na caixa do CRM normalmente, só a IA não responde sozinha
  // sem prompt (ver o gate em processIncomingMessage, lib/whatsapp-inbound.ts).
  const config = await prisma.agentConfig.findFirst({ where: { uazapiToken: token, active: true } });
  if (!config || !config.uazapiToken) {
    return NextResponse.json({ ok: true });
  }

  const caption: string = typeof message.text === "string" && message.text
    ? message.text
    : mediaCaption(message) || (typeof message.content === "string" ? message.content : "");

  const mimetype = mediaMimetype(message);
  let imageUrl: string | null = null;
  let text = caption;
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;

  // Download da mídia na UazAPI com nova tentativa: ela devolve 429 (limite de requisições) e 500
  // de vez em quando, e sem a mídia a mensagem antes era descartada em silêncio (ver abaixo).
  const uazToken = config.uazapiToken;
  const msgId = message.id || message.messageid;
  async function baixarMidia() {
    let ultimoErro: unknown;
    for (const espera of [0, 1500, 4000]) {
      if (espera) await new Promise(r => setTimeout(r, espera));
      try {
        return await downloadMessageMedia(uazToken, msgId);
      } catch (err) {
        ultimoErro = err;
      }
    }
    throw ultimoErro;
  }

  // Se a mídia não puder ser baixada (ou o áudio transcrito), a mensagem entra no CRM mesmo assim,
  // com um aviso no lugar do conteúdo — nunca some. Antes, mídia sem legenda que falhava ficava
  // com texto vazio e era descartada antes de chegar na conversa.
  if (!caption && mimetype?.startsWith("audio/")) {
    mediaType = "audio";
    try {
      const media = await baixarMidia();
      mediaUrl = await persistRemoteMedia(media.fileURL, media.mimetype);
      try {
        text = (await transcribeAudio(media.fileURL, media.mimetype)).trim();
      } catch (err) {
        console.error("[whatsapp-webhook] erro ao transcrever áudio:", err);
      }
      if (!text) text = "[Áudio enviado pelo cliente — não foi possível transcrever]";
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao baixar áudio:", err);
      mediaType = null;
      text = "[Áudio enviado pelo cliente — não foi possível baixar o arquivo]";
    }
  } else if (mimetype?.startsWith("image/")) {
    try {
      const media = await baixarMidia();
      imageUrl = media.fileURL;
      mediaUrl = await persistRemoteMedia(media.fileURL, media.mimetype);
      mediaType = "image";
      text = caption ? `[Imagem] ${caption}` : "[Imagem enviada pelo cliente]";
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao baixar imagem:", err);
      text = caption ? `[Imagem — não foi possível baixar] ${caption}` : "[Imagem enviada pelo cliente — não foi possível baixar o arquivo]";
    }
  } else if (mimetype?.startsWith("video/")) {
    try {
      const media = await baixarMidia();
      mediaUrl = await persistRemoteMedia(media.fileURL, media.mimetype);
      mediaType = "video";
      text = caption ? `[Vídeo] ${caption}` : "[Vídeo enviado pelo cliente]";
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao baixar vídeo:", err);
      text = caption ? `[Vídeo — não foi possível baixar] ${caption}` : "[Vídeo enviado pelo cliente — não foi possível baixar o arquivo]";
    }
  } else if (mimetype && !mimetype.startsWith("audio/")) {
    // Qualquer outro mimetype (PDF, planilha, etc.) vira documento
    const fileName = mediaFileName(message);
    try {
      const media = await baixarMidia();
      mediaUrl = await persistRemoteMedia(media.fileURL, media.mimetype);
      mediaType = "document";
      text = caption ? `[Documento] ${caption}` : `[Documento enviado pelo cliente${fileName ? `: ${fileName}` : ""}]`;
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao baixar documento:", err);
      text = caption
        ? `[Documento — não foi possível baixar] ${caption}`
        : `[Documento enviado pelo cliente${fileName ? `: ${fileName}` : ""} — não foi possível baixar o arquivo]`;
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
