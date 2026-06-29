import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) return NextResponse.json({ quickReplies: [] });

  const quickReplies = await prisma.quickReply.findMany({
    where: { agentConfigId: agentId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ quickReplies });
}

const schema = z.object({
  title: z.string().min(1).max(40),
  content: z.string().min(1).max(2000),
});

// Qualquer atendente da equipe pode criar uma resposta rápida — fica disponível pra todo mundo
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const quickReply = await prisma.quickReply.create({
    data: { agentConfigId: agentId, title: body.data.title, content: body.data.content },
  });

  return NextResponse.json({ quickReply });
}
