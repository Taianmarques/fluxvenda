import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; envioId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, envioId } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  if (!result.isManager && conversation.assignedToId && conversation.assignedToId !== userId) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const scheduledMessage = await prisma.scheduledMessage.findFirst({ where: { id: envioId, conversationId: id } });
  if (!scheduledMessage) return NextResponse.json({ error: "Envio agendado não encontrado" }, { status: 404 });
  if (scheduledMessage.sentAt) return NextResponse.json({ error: "Esse envio já foi feito" }, { status: 400 });

  await prisma.scheduledMessage.delete({ where: { id: envioId } });
  return NextResponse.json({ ok: true });
}
