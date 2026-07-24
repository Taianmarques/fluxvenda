import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent-engine";
import { sendInstagramDM, sendInstagramPrivateReply, getInstagramUserProfile } from "@/lib/instagram";
import { logTokenUsage, isOverQuota } from "@/lib/token-usage";
import { startFunnelExecution, handleFunnelReply } from "@/lib/instagram-funnel";
import { emitChatEvent } from "@/lib/realtime";
import { verifyMetaHandshake, verifyMetaSignature } from "@/lib/meta-webhook";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { extractBrazilianPhoneFromText } from "@/lib/phone-extract";

// GET: verificação de webhook pela Meta (hub challenge)
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (verifyMetaHandshake(mode, token, process.env.INSTAGRAM_VERIFY_TOKEN)) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST: eventos de mensagem enviados pela Meta
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature, process.env.META_APP_SECRET)) {
    return new Response("Invalid signature", { status: 401 });
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

// Procura a conexão dona do ID que chegou no webhook: consulta /me com o token de cada
// conexão cujo ID salvo não bate e corrige o banco quando o user_id retornado é o do webhook.
async function healConnection(igBusinessAccountId: string) {
  const candidates = await prisma.instagramConnection.findMany({
    where: { instagramBusinessAccountId: { not: igBusinessAccountId } },
    take: 20,
  });
  for (const c of candidates) {
    try {
      const res = await fetch(`https://graph.instagram.com/me?fields=user_id,id&access_token=${c.pageAccessToken}`);
      const data = await res.json();
      if (!res.ok || data.error) continue;
      const ownIds = [data.user_id, data.id].filter(Boolean).map(String);
      if (!ownIds.includes(igBusinessAccountId)) continue;
      await prisma.instagramConnection.update({
        where: { id: c.id },
        data: { instagramBusinessAccountId: igBusinessAccountId, pageId: igBusinessAccountId },
      });
      console.log("[ig-heal] connection", c.id, "atualizada para igBizId", igBusinessAccountId);
      return { ...c, instagramBusinessAccountId: igBusinessAccountId, pageId: igBusinessAccountId };
    } catch {}
  }
  return null;
}

async function processMessage(igBusinessAccountId: string, senderIgsid: string, text: string) {
  console.log("[ig-msg] processing igBizId:", igBusinessAccountId, "sender:", senderIgsid, "text:", text.slice(0, 50));
  let connection = await prisma.instagramConnection.findUnique({
    where: { instagramBusinessAccountId: igBusinessAccountId },
  });
  console.log("[ig-msg] connection found:", !!connection);

  // Auto-heal: conexões antigas salvaram o ID app-scoped em vez do ID profissional (17841...)
  // que o webhook envia. Consulta /me de cada conexão e corrige quando o user_id bate.
  if (!connection) {
    connection = await healConnection(igBusinessAccountId);
  }

  if (!connection) { console.log("[ig-msg] no connection found, dropping"); return; }

  const config = await prisma.agentConfig.findUnique({ where: { id: connection.agentConfigId } });
  console.log("[ig-msg] config found:", !!config, "active:", config?.active);
  if (!config || !config.active) { console.log("[ig-msg] config missing or inactive, dropping"); return; }

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

  if (!config.systemPrompt) { console.log("[ig-msg] no systemPrompt, dropping"); return; }

  // Usa "ig_" como prefixo para distinguir de números de WhatsApp no campo contactNumber
  const contactNumber = `ig_${senderIgsid}`;

  const conversation = await prisma.conversation.upsert({
    where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber } },
    update: { status: "ATIVO", followupCount: 0 },
    create: { agentConfigId: config.id, contactNumber, status: "ATIVO" },
  });

  // Nome do lead ainda não resolvido (1ª mensagem dele) — busca na API do Instagram, só uma vez
  if (!conversation.contactName) {
    try {
      const profile = await getInstagramUserProfile(connection.pageAccessToken, senderIgsid);
      const name = profile.name || profile.username;
      if (name) {
        await prisma.conversation.update({ where: { id: conversation.id }, data: { contactName: name } });
        conversation.contactName = name;
      }
    } catch (err) {
      console.error("[ig-msg] erro ao buscar nome do lead:", err);
    }
  }

  // Histórico antes de salvar a mensagem atual (mesmo padrão do webhook WhatsApp)
  const recentMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id, role: { not: "note" } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const savedMsg = await prisma.message.create({
    data: { conversationId: conversation.id, role: "user", content: text },
  });
  emitChatEvent(config.id, conversation.id); // push em tempo real pro CRM

  // Atendente assumiu a conversa OU o canal está pausado só pra IA — em ambos os casos a
  // mensagem já foi salva acima (aparece no chat normalmente), só não gera resposta automática
  if (conversation.humanTakeover) return;
  if (config.instagramAiPaused) return;

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

  // Proteção contra loop IA-com-IA em duas camadas: rajada (5+/60s) e sustentado (12+/10min)
  const [burstReplies, sustainedReplies] = await Promise.all([
    prisma.message.count({
      where: { conversationId: conversation.id, role: "assistant", createdAt: { gte: new Date(Date.now() - 60_000) } },
    }),
    prisma.message.count({
      where: { conversationId: conversation.id, role: "assistant", createdAt: { gte: new Date(Date.now() - 10 * 60_000) } },
    }),
  ]);
  if (burstReplies >= 5 || sustainedReplies >= 12) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { humanTakeover: true, status: "ATIVO" } });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "note",
        content: `Agente pausado automaticamente: possível contato automatizado detectado (${burstReplies >= 5 ? `${burstReplies} respostas em 60s` : `${sustainedReplies} respostas em 10min`}).`,
      },
    });
    return;
  }

  if (await isOverQuota(config.teamId)) return;

  const emojiInstruction = config.emojiEnabled
    ? "\n\nEmojis: você PODE e DEVE usar emojis nas respostas."
    : "\n\nEmojis: NUNCA use emojis nas respostas.";

  // Contato automático no WhatsApp quando a pessoa manda o número dela na DM — efeito colateral,
  // não substitui a resposta normal da IA aqui no Instagram (que segue abaixo). Isolado em
  // try/catch pra nunca derrubar o fluxo normal se o handoff falhar.
  if (!conversation.extractedWhatsappNumber) {
    handleInstagramWhatsappHandoff().catch((err) => console.error("[ig-whatsapp-handoff]", err));
  }

  async function handleInstagramWhatsappHandoff() {
    if (!config) return;
    const detectedPhone = extractBrazilianPhoneFromText(text);
    if (!detectedPhone) return;

    // Trava atômica: só segue quem conseguir "reservar" a detecção nessa conversa
    const claimed = await prisma.conversation.updateMany({
      where: { id: conversation.id, extractedWhatsappNumber: null },
      data: { extractedWhatsappNumber: detectedPhone },
    });
    if (claimed.count === 0) return;

    // Envio a frio só é confiável via UazAPI — a Cloud API oficial exige template aprovado
    // fora da janela de 24h (mesma regra já usada no cron de prospecção)
    const podeEnviar = config.whatsappProvider === "UAZAPI" && Boolean(config.uazapiToken) && Boolean(config.systemPrompt);
    if (!podeEnviar) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "note",
          content: `Número de WhatsApp detectado (${detectedPhone}) nessa conversa do Instagram, mas esse agente não tem WhatsApp (UazAPI) conectado — não foi possível contatar automaticamente.`,
        },
      });
      return;
    }

    const whatsappConversation = await prisma.conversation.upsert({
      where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber: detectedPhone } },
      update: {},
      create: { agentConfigId: config.id, contactNumber: detectedPhone, status: "ATIVO" },
    });

    const jaTemConversa = await prisma.message.count({ where: { conversationId: whatsappConversation.id } });
    if (jaTemConversa > 0) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "note",
          content: `Número de WhatsApp detectado (${detectedPhone}), mas já existe uma conversa de WhatsApp com esse contato — não iniciamos automaticamente pra não interromper um atendimento em andamento.`,
        },
      });
      return;
    }

    const historico = [...recentMessages, { role: "user", content: text }]
      .slice(-10)
      .map((m) => `${m.role === "user" ? "Cliente" : "Você"}: ${m.content}`)
      .join("\n");

    const gancho = `Você está começando uma conversa pelo WhatsApp com uma pessoa que te procurou primeiro no Instagram Direct e passou esse número de WhatsApp lá. Veja o que ela disse até agora na conversa do Instagram:\n\n${historico}\n\nMande a primeira mensagem dessa conversa de WhatsApp retomando o assunto de onde ela parou, se apresentando e perguntando como pode ajudar — sem mencionar que isso é uma mensagem automática.`;

    const handoffResult = await runAgent(config.systemPrompt! + emojiInstruction, [], gancho);

    await sendWhatsAppTextAsTeam(config.uazapiToken!, detectedPhone, handoffResult.reply);
    await prisma.message.create({ data: { conversationId: whatsappConversation.id, role: "assistant", content: handoffResult.reply } });
    emitChatEvent(config.id, whatsappConversation.id);

    logTokenUsage({
      teamId: config.teamId,
      provider: "openai",
      model: "gpt-4o-mini",
      feature: "ig_whatsapp_handoff",
      ...handoffResult.usage,
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "note",
        content: `Número de WhatsApp detectado (${detectedPhone}) — contato iniciado automaticamente por lá.`,
      },
    });
  }

  const history = recentMessages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const result = await runAgent(config.systemPrompt + emojiInstruction, history, text);

  await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: result.reply } });
  emitChatEvent(config.id, conversation.id);

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
  console.log("[ig-comment] igBizId:", igBusinessAccountId, "commenter:", commenterId, "commentId:", comment.id, "text:", text?.slice(0, 50));

  if (!commenterId || !text || !comment.id) return;
  if (commenterId === igBusinessAccountId) { console.log("[ig-comment] own comment, skipping"); return; }

  let connection = await prisma.instagramConnection.findUnique({
    where: { instagramBusinessAccountId: igBusinessAccountId },
  });

  if (!connection) {
    connection = await healConnection(igBusinessAccountId);
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
  if (!config || !config.active || !config.igCommentAutoDm) {
    console.log("[ig-comment] dropping — config:", !!config, "active:", config?.active, "autoDm:", config?.igCommentAutoDm);
    return;
  }

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
      commentId: comment.id,
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
    // Fallback: IA responde — não entra se a IA estiver pausada nesse canal (funil e
    // mensagem fixa acima continuam funcionando normalmente, só o fallback de IA é afetado)
    if (!config.systemPrompt || config.instagramAiPaused) return;
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

  // Private reply: única forma permitida de DM para quem apenas comentou (sem janela aberta)
  await sendInstagramPrivateReply(connection.pageAccessToken, comment.id, dmMessage);
  console.log("[ig-comment] private reply sent for comment", comment.id);
}
