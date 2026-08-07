import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { editMessageOnWhatsApp, deleteMessageOnWhatsApp } from "@/lib/whatsapp";
import { emitChatEvent } from "@/lib/realtime";
import { z } from "zod";

async function loadEditableMessage(conversationId: string, messageId: string, userId: string) {
  const message = await prisma.message.findFirst({ where: { id: messageId, conversationId } });
  if (!message) return { error: NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 }) };

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || !(await userBelongsToAgentConfig(userId, conversation.agentConfigId))) {
    return { error: NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 }) };
  }

  // Só mensagens que nós mandamos (humano ou IA) — o WhatsApp não deixa editar/apagar
  // mensagem de quem não é o remetente, e notas internas nunca foram pro WhatsApp.
  if (message.role === "user" || message.role === "note") {
    return { error: NextResponse.json({ error: "Só é possível editar/apagar mensagens enviadas por aqui" }, { status: 400 }) };
  }
  if (!message.waMessageId) {
    return { error: NextResponse.json({ error: "Mensagem sem referência no WhatsApp" }, { status: 400 }) };
  }
  if (message.deletedAt) {
    return { error: NextResponse.json({ error: "Mensagem já apagada" }, { status: 400 }) };
  }
  if (conversation.contactNumber.startsWith("ig_")) {
    return { error: NextResponse.json({ error: "Não suportado para conversas do Instagram" }, { status: 400 }) };
  }

  const config = await prisma.agentConfig.findUnique({ where: { id: conversation.agentConfigId } });
  if (!config?.uazapiToken) return { error: NextResponse.json({ error: "Agente não encontrado" }, { status: 404 }) };

  return { message, conversation, config };
}

const editSchema = z.object({ content: z.string().trim().min(1) });

// Edita o texto de uma mensagem já enviada — reflete no WhatsApp de verdade via UazAPI.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, messageId } = await params;
  const body = editSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const loaded = await loadEditableMessage(id, messageId, userId);
  if ("error" in loaded) return loaded.error;
  const { message, conversation, config } = loaded;

  const ok = await editMessageOnWhatsApp(config.uazapiToken!, message.waMessageId!, body.data.content);
  if (!ok) return NextResponse.json({ error: "Não foi possível editar no WhatsApp (mensagem pode estar fora da janela de edição)" }, { status: 502 });

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: body.data.content, editedAt: new Date() },
  });
  emitChatEvent(conversation.agentConfigId, id);

  return NextResponse.json({ message: updated });
}

// Apaga uma mensagem já enviada "para todos" — reflete no WhatsApp de verdade via UazAPI.
// Mantém a linha no banco (não quebra replyTo de outras mensagens nem a posição na conversa),
// só limpa o conteúdo e marca deletedAt — mesmo comportamento do "apagar para todos" do WhatsApp.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, messageId } = await params;
  const loaded = await loadEditableMessage(id, messageId, userId);
  if ("error" in loaded) return loaded.error;
  const { message, conversation, config } = loaded;

  const ok = await deleteMessageOnWhatsApp(config.uazapiToken!, message.waMessageId!);
  if (!ok) return NextResponse.json({ error: "Não foi possível apagar no WhatsApp" }, { status: 502 });

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: "Mensagem apagada", mediaUrl: null, mediaType: null, deletedAt: new Date() },
  });
  emitChatEvent(conversation.agentConfigId, id);

  return NextResponse.json({ message: updated });
}
