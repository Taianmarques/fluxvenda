import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";

// Marca a negociação como perdida: move pro estágio "Perdido" do pipeline atual, se existir
// (mesmo padrão do "ganho", que move pro "Fechado" — sem XP, perder negociação não pontua).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; oppId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, oppId } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  const { config, isManager } = result;
  if (!isManager && conversation.assignedToId && conversation.assignedToId !== userId) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const opportunity = await prisma.opportunity.findFirst({
    where: { id: oppId, conversationId: id },
    include: { stage: { include: { pipeline: true } } },
  });
  if (!opportunity) return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 });
  if (opportunity.wonAt) return NextResponse.json({ error: "Essa negociação já foi marcada como ganha" }, { status: 400 });
  if (opportunity.lostAt) return NextResponse.json({ error: "Essa negociação já foi marcada como perdida" }, { status: 400 });

  const pipelineId = opportunity.stage?.pipelineId
    ?? (await prisma.pipeline.findFirst({ where: { agentConfigId: config.id }, orderBy: { order: "asc" } }))?.id;

  const lostStage = pipelineId
    ? await prisma.pipelineStage.findFirst({ where: { pipelineId, name: { equals: "Perdido", mode: "insensitive" } } })
    : null;

  const updated = await prisma.opportunity.update({
    where: { id: oppId },
    data: { lostAt: new Date(), ...(lostStage && { stageId: lostStage.id, stageEnteredAt: new Date() }) },
  });

  return NextResponse.json({ opportunity: updated });
}
