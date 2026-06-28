import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

async function loadConversation(id: string, config: { id: string }, userId: string, isManager: boolean) {
  const conversation = await prisma.conversation.findFirst({ where: { id, agentConfigId: config.id } });
  if (!conversation) return null;
  if (!isManager && conversation.assignedToId && conversation.assignedToId !== userId) return null;
  return conversation;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getOwnAgentConfigWithRole(userId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config, isManager } = result;

  const { id } = await params;
  const conversation = await loadConversation(id, config, userId, isManager);
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const scheduledMessages = await prisma.scheduledMessage.findMany({
    where: { conversationId: id, sentAt: null },
    orderBy: { scheduledFor: "asc" },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ scheduledMessages });
}

const schema = z.object({
  content: z.string().min(1).max(2000),
  scheduledFor: z.coerce.date(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getOwnAgentConfigWithRole(userId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config, isManager } = result;

  const { id } = await params;
  const conversation = await loadConversation(id, config, userId, isManager);
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  if (body.data.scheduledFor.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Escolha uma data e hora no futuro" }, { status: 400 });
  }

  const scheduledMessage = await prisma.scheduledMessage.create({
    data: {
      conversationId: id,
      createdById: userId,
      content: body.data.content,
      scheduledFor: body.data.scheduledFor,
    },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ scheduledMessage });
}
