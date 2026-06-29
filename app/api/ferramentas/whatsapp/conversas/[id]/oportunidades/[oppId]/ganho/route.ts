import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { levelFromXP } from "@/lib/utils";

const DEAL_WON_XP = 150;

// Marca a negociação como ganha: move pro estágio "Fechado" do pipeline atual (se existir)
// e credita XP a quem marcou, conectando com a gamificação/dashboard de vendas.
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

  const pipelineId = opportunity.stage?.pipelineId
    ?? (await prisma.pipeline.findFirst({ where: { agentConfigId: config.id }, orderBy: { order: "asc" } }))?.id;

  const closedStage = pipelineId
    ? await prisma.pipelineStage.findFirst({ where: { pipelineId, name: { equals: "Fechado", mode: "insensitive" } } })
    : null;

  const updated = await prisma.opportunity.update({
    where: { id: oppId },
    data: { wonAt: new Date(), ...(closedStage && { stageId: closedStage.id, stageEnteredAt: new Date() }) },
  });

  const [, profile] = await prisma.$transaction([
    prisma.xPTransaction.create({
      data: {
        profileId: userId,
        amount: DEAL_WON_XP,
        reason: `Negociação ganha: ${conversation.contactName ?? conversation.contactNumber}`,
        source: "DEAL_WON",
      },
    }),
    prisma.profile.update({ where: { id: userId }, data: { xp: { increment: DEAL_WON_XP } } }),
  ]);

  const newLevel = levelFromXP(profile.xp);
  if (newLevel > profile.level) {
    await prisma.profile.update({ where: { id: userId }, data: { level: newLevel } });
  }

  return NextResponse.json({ opportunity: updated, xpGained: DEAL_WON_XP });
}
