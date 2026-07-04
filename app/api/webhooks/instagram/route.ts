import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent-engine";
import { sendInstagramDM } from "@/lib/instagram";
import { logTokenUsage, isOverQuota } from "@/lib/token-usage";
import { startFunnelExecution, handleFunnelReply } from "@/lib/instagram-funnel";

// GET: verificação de webhook pela Meta (hub challenge)
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST: eventos de mensagem enviados pela Meta
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verifica assinatura HMAC quando a secret está configurada
  const signature = req.headers.get("x-hub-signature-256");
  if (signature && process.env.META_APP_SECRET) {
    const expected = "sha256=" + createHmac("sha256", process.env.META_APP_SECRET).update(rawBody).digest("hex");
    if (signature !== expected) return new Response("Invalid signature", { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: true }); }

  console.log("[ig-webhook] full:", JSON.stringify(body));
  for (const e of body.entry ?? []) {
    for (const m of e.messaging ?? []) {
      console.log("[ig-webhook] msg sender:", m.sender?.id, "text:", m.message?.text, "hasMsg:", !!m.message);
    }
  }

  if (body.object !== "instagram") return NextResponse.json({ ok: true });

  for (const entry of body.entry ?? []) {
    const igBusinessAccountId: string = entry.id;

    for (const event of entry.messaging ?? []) {
      // Ignora ecos (mensagens enviadas pelo próprio agente)
      if (!event.message || event.sender?.id === igBusinessAccountId) continue;

      const senderIgsid: string | undefined = event.sender?.id;
      const text: string = event.message?.text ?? "";

      if (!senderIgsid || !text) continue;

      // Processa em background para retornar 200 imediatamente (Meta exige resposta rápida)
      processMessage(igBusinessAccountId, senderIgsid, text).catch((err) =>
        console.error("[instagram-webhook] processMessage:", err)
      );
    }

    for (const change of entry.changes ?? []) {
      if (change.field === "comments" && change.value) {
        processComment(igBusinessAccountId, change.value).catch((err) =>
          console.error("[instagram-webhook] processComment:", err)
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}

async function processMessage(igBusinessAccountId: string, senderIgsid: string, text: string) {
  let connection = await prisma.instagramConnection.findUnique({
    where: { instagramBusinessAccountId: igBusinessAccountId },
  });

  // Auto-heal: GET /me pode retornar um ID app-scoped diferente do ID que o webhook envia.
  // Se não encontrar, testa o token de cada conexão contra o ID do webhook e corrige o banco.
  if (!connection) {
    const all = await prisma.instagramConnection.findMany({ take: 20 });
    for (const c of all) {
      try {
        const res = await fetch(`https://graph.instagram.com/v21.0/${igBusinessAccountId}?fields=id&access_token=${c.pageAccessToken}`);
        const data = await res.json();
        if (!data.error && String(data.id) === igBusinessAccountId) {
          await prisma.instagramConnection.update({
            where: { id: c.id },
            data: { instagramBusinessAccountId: igBusinessAccountId, pageId: igBusinessAccountId },
          });
          connection = { ...c, instagramBusinessAccountId: igBusinessAccountId, pageId: igBusinessAccountId };
          break;
        }
      } catch {}
    }
  }

  if (!connection) return;

  const config = await prisma.agentConfig.findUnique({ where: { id: connection.agentConfigId } });
  if (!config || !config.active) return;

  // Se o contato está em um funil aguardando resposta, o funil assume o controle
  const handledByFunnel = await handleFunnelReply({
    agentConfigId: connection.agentConfigId,
    contactIgsid: senderIgsid,
    text,
    igBusinessAccountId,
    pageAccessToken: connection.pageAccessToken,
  });
  if (handledByFunnel) return;

  // Verifica se algum funil tem gatilho de DM que bate com essa mensagem
  const dmFunnels = await prisma.instagramFunnel.findMany({
    where: { agentConfigId: connection.agentConfigId, active: true, dmTriggerEnabled: true },
    orderBy: { createdAt: "asc" },
  });
  const lowerText = text.toLowerCase();
  const matchedDmFunnel = dmFunnels.find((f) =>
    f.dmTriggerKeywords.length === 0
      ? true
      : f.dmTriggerKeywords.some((kw) => lowerText.includes(kw.toLowerCase()))
  );
  if (matchedDmFunnel) {
    // Não dispara se o contato já está em uma execução ativa desse funil
    const alreadyRunning = await prisma.instagramFunnelExecution.findFirst({
      where: {
        funnelId: matchedDmFunnel.id,
        contactIgsid: senderIgsid,
        status: { in: ["RUNNING", "WAITING_DELAY", "WAITING_INPUT"] },
      },
    });
    if (!alreadyRunning) {
      await startFunnelExecution({
        funnelId: matchedDmFunnel.id,
        agentConfigId: connection.agentConfigId,
        contactIgsid: senderIgsid,
        igBusinessAccountId,
        pageAccessToken: connection.pageAccessToken,
      });
      return;
    }
  }

  if (!config.systemPrompt) return;

  // Usa "ig_" como prefixo para distinguir de números de WhatsApp no campo contactNumber
  const contactNumber = `ig_${senderIgsid}`;

  const conversation = await prisma.conversation.upsert({
    where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber } },
    update: { status: "ATIVO", followupCount: 0 },
    create: { agentConfigId: config.id, contactNumber, status: "ATIVO" },
  });

  if (conversation.humanTakeover) return;

  // Histórico antes de salvar a mensagem atual (mesmo padrão do webhook WhatsApp)
  const recentMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id, role: { not: "note" } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const savedMsg = await prisma.message.create({
    data: { conversationId: conversation.id, role: "user", content: text },
  });

  // Debounce: aguarda mensagens em partes antes de responder
  const debounceMs = Number(process.env.MESSAGE_DEBOUNCE_MS ?? "8000");
  if (debounceMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, debounceMs));
    const latest = await prisma.message.findFirst({
      where: { conversationId: conversation.id, role: "user" },
      orderBy: { createdAt: "desc" },
    });
    if (latest?.id !== savedMsg.id) return;
  }

  // Proteção contra loop IA-com-IA
  const recentAIReplies = await prisma.message.count({
    where: {
      conversationId: conversation.id,
      role: "assistant",
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recentAIReplies >= 5) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { humanTakeover: true, status: "ATIVO" } });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "note",
        content: "Agente pausado automaticamente: possível contato automatizado detectado (≥5 respostas em 60s).",
      },
    });
    return;
  }

  if (await isOverQuota(config.teamId)) return;

  const history = recentMessages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const emojiInstruction = config.emojiEnabled
    ? "\n\nEmojis: você PODE e DEVE usar emojis nas respostas."
    : "\n\nEmojis: NUNCA use emojis nas respostas.";

  const result = await runAgent(config.systemPrompt + emojiInstruction, history, text);

  await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: result.reply } });

  logTokenUsage({
    teamId: config.teamId,
    provider: "openai",
    model: "gpt-4o-mini",
    feature: "instagram_agent",
    ...result.usage,
  });

  await sendInstagramDM(igBusinessAccountId, connection.pageAccessToken, senderIgsid, result.reply);
}

async function processComment(igBusinessAccountId: string, comment: {
  id?: string;
  text?: string;
  from?: { id?: string };
  media?: { id?: string };
}) {
  const commenterId = comment.from?.id;
  const text = comment.text;

  if (!commenterId || !text) return;
  if (commenterId === igBusinessAccountId) return;

  let connection = await prisma.instagramConnection.findUnique({
    where: { instagramBusinessAccountId: igBusinessAccountId },
  });

  if (!connection) {
    const all = await prisma.instagramConnection.findMany({ take: 20 });
    for (const c of all) {
      try {
        const res = await fetch(`https://graph.instagram.com/v21.0/${igBusinessAccountId}?fields=id&access_token=${c.pageAccessToken}`);
        const data = await res.json();
        if (!data.error && String(data.id) === igBusinessAccountId) {
          await prisma.instagramConnection.update({
            where: { id: c.id },
            data: { instagramBusinessAccountId: igBusinessAccountId, pageId: igBusinessAccountId },
          });
          connection = { ...c, instagramBusinessAccountId: igBusinessAccountId, pageId: igBusinessAccountId };
          break;
        }
      } catch {}
    }
  }

  if (!connection) return;

  const config = await prisma.agentConfig.findUnique({
    where: { id: connection.agentConfigId },
    include: {
      igCommentFlows: {
        where: { active: true },
        orderBy: { order: "asc" },
        select: { keywords: true, replyMessage: true, funnelId: true },
      },
    },
  });
  if (!config || !config.active || !config.igCommentAutoDm) return;

  // Procura o primeiro fluxo ativo cujas keywords batem com o comentário
  const lowerText = text.toLowerCase();
  const matchedFlow = config.igCommentFlows.find((flow) => {
    if (flow.keywords.length === 0) return true; // catch-all
    return flow.keywords.some((kw) => lowerText.includes(kw.toLowerCase()));
  });

  // Funil tem prioridade sobre mensagem direta
  if (matchedFlow?.funnelId) {
    await startFunnelExecution({
      funnelId: matchedFlow.funnelId,
      agentConfigId: connection.agentConfigId,
      contactIgsid: commenterId,
      igBusinessAccountId,
      pageAccessToken: connection.pageAccessToken,
    });
    return;
  }

  let dmMessage: string;
  if (matchedFlow?.replyMessage) {
    dmMessage = matchedFlow.replyMessage;
  } else if (config.igCommentDmMessage) {
    // Fallback: mensagem fixa configurada (nenhum fluxo bateu)
    dmMessage = config.igCommentDmMessage;
  } else {
    // Fallback: IA responde
    if (!config.systemPrompt) return;
    if (await isOverQuota(config.teamId)) return;

    const result = await runAgent(
      config.systemPrompt,
      [],
      `Alguém comentou no seu post: "${text}". Responda com uma mensagem direta e personalizada para continuar a conversa no privado.`
    );
    dmMessage = result.reply;

    logTokenUsage({
      teamId: config.teamId,
      provider: "openai",
      model: "gpt-4o-mini",
      feature: "instagram_comment",
      ...result.usage,
    });
  }

  await sendInstagramDM(igBusinessAccountId, connection.pageAccessToken, commenterId, dmMessage);
}
