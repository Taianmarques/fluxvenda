import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  if (body.EventType !== "messages") return NextResponse.json({ ok: true });

  const message = body.message;
  const token: string | undefined = body.token;
  const text: string = message?.text || message?.content || "";

  // Ignora eco de mensagens enviadas pela própria API, mensagens de grupo ou payloads sem texto
  if (!message || !token || message.fromMe || message.wasSentByApi || message.isGroup || !text) {
    return NextResponse.json({ ok: true });
  }

  const config = await prisma.agentConfig.findFirst({ where: { uazapiToken: token, active: true } });
  if (!config || !config.systemPrompt || !config.uazapiToken) {
    return NextResponse.json({ ok: true });
  }

  const contactNumber: string = String(message.sender_pn || message.chatid).split("@")[0];
  const contactName: string | undefined = message.senderName || body.chat?.wa_contactName || body.chat?.name;

  const conversation = await prisma.conversation.upsert({
    where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber } },
    update: { status: "ATIVO", ...(contactName && { contactName }) },
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
