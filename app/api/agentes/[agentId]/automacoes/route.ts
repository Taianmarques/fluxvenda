import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) return NextResponse.json({ automacoes: [] });

  const automacoes = await prisma.automacao.findMany({
    where: { agentConfigId: agentId },
    orderBy: { createdAt: "asc" },
    include: {
      quickReply: { select: { title: true, content: true } },
      targetStage: { select: { name: true, color: true, pipeline: { select: { name: true } } } },
    },
  });
  return NextResponse.json({ automacoes });
}

const schema = z.object({
  nome: z.string().min(1).max(60),
  quickReplyId: z.string().min(1),
  targetStageId: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) {
    return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  // Valida que a resposta rápida e a etapa pertencem a esse agente
  const [quickReply, stage] = await Promise.all([
    prisma.quickReply.findFirst({ where: { id: body.data.quickReplyId, agentConfigId: agentId } }),
    prisma.pipelineStage.findFirst({ where: { id: body.data.targetStageId, pipeline: { agentConfigId: agentId } } }),
  ]);
  if (!quickReply || !stage) return NextResponse.json({ error: "Resposta rápida ou etapa inválida" }, { status: 400 });

  const automacao = await prisma.automacao.create({
    data: { agentConfigId: agentId, nome: body.data.nome, quickReplyId: quickReply.id, targetStageId: stage.id },
  });
  return NextResponse.json({ automacao });
}
