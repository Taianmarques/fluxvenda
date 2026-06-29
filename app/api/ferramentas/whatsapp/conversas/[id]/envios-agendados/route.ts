import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

async function loadConversation(id: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return null;
  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return null;
  if (!result.isManager && conversation.assignedToId && conversation.assignedToId !== userId) return null;
  return conversation;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await loadConversation(id, userId);
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

  const { id } = await params;
  const conversation = await loadConversation(id, userId);
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
