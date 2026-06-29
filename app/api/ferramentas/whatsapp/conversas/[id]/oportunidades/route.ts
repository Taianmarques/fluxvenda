import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

async function loadConversationAndConfig(id: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return null;
  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return null;
  if (!result.isManager && conversation.assignedToId && conversation.assignedToId !== userId) return null;
  return { conversation, config: result.config };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const loaded = await loadConversationAndConfig(id, userId);
  if (!loaded) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const opportunities = await prisma.opportunity.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ opportunities });
}

const schema = z.object({
  title: z.string().max(60).nullable().optional(),
  dealValue: z.number().positive(),
  stageId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const loaded = await loadConversationAndConfig(id, userId);
  if (!loaded) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  const { config } = loaded;

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  let stageId = body.data.stageId ?? null;
  if (stageId) {
    const stage = await prisma.pipelineStage.findFirst({ where: { id: stageId, pipeline: { agentConfigId: config.id } } });
    if (!stage) stageId = null;
  } else {
    // Sem etapa informada: cai na primeira etapa do primeiro pipeline, igual ao comportamento antigo
    const firstStage = await prisma.pipelineStage.findFirst({
      where: { pipeline: { agentConfigId: config.id } },
      orderBy: [{ pipeline: { order: "asc" } }, { order: "asc" }],
    });
    stageId = firstStage?.id ?? null;
  }

  const opportunity = await prisma.opportunity.create({
    data: {
      conversationId: id,
      title: body.data.title || null,
      dealValue: body.data.dealValue,
      stageId,
    },
  });

  return NextResponse.json({ opportunity });
}
