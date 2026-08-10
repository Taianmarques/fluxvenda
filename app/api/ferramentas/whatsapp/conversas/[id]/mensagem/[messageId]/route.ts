import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { deleteMessage, editMessageText } from "@/lib/whatsapp";
import { emitChatEvent } from "@/lib/realtime";
import { z } from "zod";

// Resolve conversa + mensagem + permissão, comum ao PATCH (editar) e DELETE (apagar) abaixo.
// Só mensagens da própria empresa (role "human") ou da IA (role "assistant") podem ser
// editadas/apagadas — são as únicas que saíram pelo número da empresa no WhatsApp.
async function resolveEditableMessage(userId: string, conversationId: string, messageId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return { error: NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 }) } as const;

  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return { error: NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 }) } as const;
  const { config, isManager } = result;

  const message = await prisma.message.findFirst({ where: { id: messageId, conversationId } });
  if (!message) return { error: NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 }) } as const;

  if (message.deleted) return { error: NextResponse.json({ error: "Mensagem já foi apagada" }, { status: 400 }) } as const;
  if (message.role !== "human" && message.role !== "assistant") {
    return { error: NextResponse.json({ error: "Só é possível editar/apagar mensagens enviadas pela empresa" }, { status: 400 }) } as const;
  }
  if (message.role === "human" && message.senderId !== userId && !isManager) {
    return { error: NextResponse.json({ error: "Só quem enviou (ou o gestor) pode editar/apagar essa mensagem" }, { status: 403 }) } as const;
  }
  if (message.role === "assistant" && !isManager) {
    return { error: NextResponse.json({ error: "Só o gestor pode editar/apagar mensagens da IA" }, { status: 403 }) } as const;
  }
  if (conversation.contactNumber.startsWith("ig_")) {
    return { error: NextResponse.json({ error: "Instagram não suporta editar/apagar mensagens" }, { status: 400 }) } as const;
  }
  if (!config.uazapiToken || !message.waMessageId) {
    return { error: NextResponse.json({ error: "Essa mensagem não pode ser editada/apagada no WhatsApp" }, { status: 400 }) } as const;
  }

  return { conversation, message, config } as const;
}

const editSchema = z.object({ content: z.string().trim().min(1).max(4096) });

// Edita o texto de uma mensagem já enviada — só mensagens de texto puro (sem mídia)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, messageId } = await params;
  const body = editSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const resolved = await resolveEditableMessage(userId, id, messageId);
  if ("error" in resolved) return resolved.error;
  const { message, config } = resolved;

  if (message.mediaUrl) return NextResponse.json({ error: "Mensagens com mídia não podem ser editadas" }, { status: 400 });

  try {
    await editMessageText(config.uazapiToken!, message.waMessageId!, body.data.content);
  } catch (err) {
    console.error("[mensagem] erro ao editar no WhatsApp:", err);
    return NextResponse.json({ error: "Não foi possível editar no WhatsApp (a janela de edição pode ter expirado)" }, { status: 502 });
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: body.data.content, edited: true },
  });
  emitChatEvent(config.id, id);

  return NextResponse.json({ message: updated });
}

// Apaga uma mensagem já enviada para todos os participantes (soft-delete local + revoke no WhatsApp)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, messageId } = await params;
  const resolved = await resolveEditableMessage(userId, id, messageId);
  if ("error" in resolved) return resolved.error;
  const { message, config } = resolved;

  try {
    await deleteMessage(config.uazapiToken!, message.waMessageId!);
  } catch (err) {
    console.error("[mensagem] erro ao apagar no WhatsApp:", err);
    return NextResponse.json({ error: "Não foi possível apagar no WhatsApp (a janela de exclusão pode ter expirado)" }, { status: 502 });
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { deleted: true },
  });
  emitChatEvent(config.id, id);

  return NextResponse.json({ message: updated });
}
