import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { loadTaskSummaries } from "@/lib/pipeline-cards";
import { getAgentConfigWithRole } from "@/lib/team";
import { podeVerNaoAtribuidos } from "@/lib/crm-access";

// Lista todas as oportunidades das conversas visíveis pro usuário, já achatadas com os
// dados da conversa — usado pelo board do Pipeline (cada card é uma oportunidade, não uma conversa).
export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ opportunities: [] });
  const { config, isManager } = result;
  const verNaoAtribuidos = isManager || (await podeVerNaoAtribuidos(userId));

  const opportunities = await prisma.opportunity.findMany({
    where: {
      conversation: {
        agentConfigId: config.id,
        ...(isManager ? {} : { OR: [{ assignedToId: userId }, ...(verNaoAtribuidos ? [{ assignedToId: null }] : [])] }),
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

  // Tarefas de cada card (contagem, checklist e próxima) — ver lib/pipeline-cards.ts
  const taskMap = await loadTaskSummaries(opportunities.map(o => o.id));

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
      lastContactAt: o.conversation.messages[0]?.createdAt ?? null,
      tasksTotal: taskMap.get(o.id)?.total ?? 0,
      tasksDone: taskMap.get(o.id)?.done ?? 0,
      tasks: taskMap.get(o.id)?.items ?? [],
      nextTask: taskMap.get(o.id)?.next ?? null,
    })),
  });
}
