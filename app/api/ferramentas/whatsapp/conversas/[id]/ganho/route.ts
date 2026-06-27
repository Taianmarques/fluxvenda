import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { levelFromXP } from "@/lib/utils";

const DEAL_WON_XP = 150;

async function getOwnAgentConfig(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) return null;
  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return null;
  return prisma.agentConfig.findUnique({ where: { teamId: team.id } });
}

// Marca a negociação como ganha: move pro estágio "Fechado" do pipeline atual (se existir)
// e credita XP ao gestor, conectando com a gamificação/dashboard de vendas.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, agentConfigId: config.id },
    include: { stage: { include: { pipeline: true } } },
  });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  if (conversation.dealValue == null) return NextResponse.json({ error: "Defina o valor negociado antes de marcar como ganho" }, { status: 400 });
  if (conversation.wonAt) return NextResponse.json({ error: "Essa negociação já foi marcada como ganha" }, { status: 400 });

  const pipelineId = conversation.stage?.pipelineId
    ?? (await prisma.pipeline.findFirst({ where: { agentConfigId: config.id }, orderBy: { order: "asc" } }))?.id;

  const closedStage = pipelineId
    ? await prisma.pipelineStage.findFirst({ where: { pipelineId, name: { equals: "Fechado", mode: "insensitive" } } })
    : null;

  const updated = await prisma.conversation.update({
    where: { id },
    data: { wonAt: new Date(), ...(closedStage && { stageId: closedStage.id }) },
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

  return NextResponse.json({ conversation: updated, xpGained: DEAL_WON_XP });
}
