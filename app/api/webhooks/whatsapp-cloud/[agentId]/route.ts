// Webhook da WhatsApp Cloud API (Meta oficial) — só faz o parsing do payload específico
// da Meta e delega o atendimento para o pipeline compartilhado em lib/whatsapp-inbound.ts.
// Diferente da UazAPI, o roteamento multi-tenant vem do agentId na URL (configurado como
// webhook por agente no Meta App Dashboard), não do payload.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transcribeAudioBuffer } from "@/lib/agent-engine";
import { sendCloudText, sendCloudMedia, downloadCloudMedia } from "@/lib/whatsapp-cloud";
import { verifyMetaHandshake, verifyMetaSignature } from "@/lib/meta-webhook";
import { processIncomingMessage, type ChannelAdapter } from "@/lib/whatsapp-inbound";

// GET: verificação de webhook pela Meta (hub challenge) — o verify token é gerado por agente
export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  const config = await prisma.agentConfig.findUnique({ where: { id: agentId }, select: { cloudApiVerifyToken: true } });
  if (verifyMetaHandshake(mode, token, config?.cloudApiVerifyToken)) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST: eventos de mensagem enviados pela Meta
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const rawBody = await req.text();

  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature, process.env.META_APP_SECRET)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: true }); }

  if (body.object !== "whatsapp_business_account") return NextResponse.json({ ok: true });

  const config = await prisma.agentConfig.findUnique({ where: { id: agentId } });
  if (!config || !config.systemPrompt || config.whatsappProvider !== "CLOUD_API" || !config.cloudApiPhoneNumberId || !config.cloudApiAccessToken) {
    return NextResponse.json({ ok: true });
  }

  const phoneNumberId = config.cloudApiPhoneNumberId;
  const accessToken = config.cloudApiAccessToken;
  const adapter: ChannelAdapter = {
    sendText: (phone, t) => sendCloudText(phoneNumberId, accessToken, phone, t),
    sendMedia: (phone, type, base64, opts) => sendCloudMedia(phoneNumberId, accessToken, phone, type, base64, opts),
  };

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const messages = value?.messages;
      if (!messages || messages.length === 0) continue; // ignora eventos de status (entregue/lido)

      const contactName: string | undefined = value.contacts?.[0]?.profile?.name;

      for (const message of messages) {
        try {
          await handleOneMessage(config, message, contactName, accessToken, adapter);
        } catch (err) {
          console.error("[whatsapp-cloud-webhook] erro ao processar mensagem:", err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

async function handleOneMessage(
  config: NonNullable<Awaited<ReturnType<typeof prisma.agentConfig.findUnique>>>,
  message: any,
  contactName: string | undefined,
  accessToken: string,
  adapter: ChannelAdapter
): Promise<void> {
  const contactNumber: string = String(message.from);

  let text = "";
  let caption = "";
  let imageUrl: string | null = null;
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;

  if (message.type === "text") {
    text = message.text?.body ?? "";
    caption = text;
  } else if (message.type === "image") {
    const { buffer, mimetype } = await downloadCloudMedia(message.image.id, accessToken);
    caption = message.image?.caption ?? "";
    imageUrl = `data:${mimetype};base64,${buffer.toString("base64")}`;
    mediaUrl = imageUrl;
    mediaType = "image";
    text = caption ? `[Imagem] ${caption}` : "[Imagem enviada pelo cliente]";
  } else if (message.type === "audio") {
    const { buffer, mimetype } = await downloadCloudMedia(message.audio.id, accessToken);
    text = await transcribeAudioBuffer(buffer, mimetype);
    mediaType = "audio";
  } else {
    return; // tipo de mensagem não suportado (documento, localização, interativo, etc.)
  }

  if (!text) return;

  await processIncomingMessage(
    config,
    {
      text, caption, contactNumber, contactName, mediaUrl, mediaType, imageUrl,
      waMessageId: message.id ?? null,             // wamid da Meta
      quotedWaMessageId: message.context?.id ?? null, // presente quando o cliente responde citando
    },
    adapter,
    { enforceSessionWindow: true }
  );
}
