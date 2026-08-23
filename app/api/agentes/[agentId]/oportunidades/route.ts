import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";

// Lista todas as oportunidades das conversas visíveis pro usuário, já achatadas com os
// dados da conversa — usado pelo board do Pipeline (cada card é uma oportunidade, não uma conversa).
export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ opportunities: [] });
  const { config, isManager } = result;

  const opportunities = await prisma.opportunity.findMany({
    where: {
      conversation: {
        agentConfigId: config.id,
        ...(isManager ? {} : { OR: [{ assignedToId: userId }, { assignedToId: null }] }),
      },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      conversation: {
        include: {
          messages: { where: { role: { not: "note" } }, orderBy: { createdAt: "desc" }, take: 1 },
          assignedTo: { select: { name: true } },
        },
      },
      motivoPerda: { select: { nome: true } },
    },
  });

  // Contador de tarefas (total/concluídas) por oportunidade — uma query só, sem N+1
  const oppIds = opportunities.map(o => o.id);
  const taskCounts = oppIds.length > 0
    ? await prisma.opportunityTask.groupBy({ by: ["opportunityId", "done"], where: { opportunityId: { in: oppIds } }, _count: true })
    : [];
  const taskMap = new Map<string, { total: number; done: number }>();
  for (const row of taskCounts) {
    const entry = taskMap.get(row.opportunityId) ?? { total: 0, done: 0 };
    entry.total += row._count;
    if (row.done) entry.done += row._count;
    taskMap.set(row.opportunityId, entry);
  }

  return NextResponse.json({
    opportunities: opportunities.map(o => ({
      id: o.id,
      conversationId: o.conversationId,
      contactName: o.conversation.contactName,
      contactNumber: o.conversation.contactNumber,
      leadStatusId: o.conversation.leadStatusId,
      assignedToId: o.conversation.assignedToId,
      assignedToName: o.conversation.assignedTo?.name ?? null,
      title: o.title,
      stageId: o.stageId,
      dealValue: o.dealValue,
      wonAt: o.wonAt,
      lostAt: o.lostAt,
      motivoPerdaNome: o.motivoPerda?.nome ?? null,
      createdAt: o.createdAt,
      stageEnteredAt: o.stageEnteredAt,
      updatedAt: o.updatedAt,
      lastMessage: o.conversation.messages[0]?.content ?? null,
      tasksTotal: taskMap.get(o.id)?.total ?? 0,
      tasksDone: taskMap.get(o.id)?.done ?? 0,
    })),
  });
}
