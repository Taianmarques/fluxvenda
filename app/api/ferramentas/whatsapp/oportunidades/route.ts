import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfigWithRole } from "@/lib/team";

// Lista todas as oportunidades das conversas visíveis pro usuário, já achatadas com os
// dados da conversa — usado pelo board do Pipeline (cada card é uma oportunidade, não uma conversa).
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getOwnAgentConfigWithRole(userId);
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
        include: { messages: { where: { role: { not: "note" } }, orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  return NextResponse.json({
    opportunities: opportunities.map(o => ({
      id: o.id,
      conversationId: o.conversationId,
      contactName: o.conversation.contactName,
      contactNumber: o.conversation.contactNumber,
      leadStatusId: o.conversation.leadStatusId,
      title: o.title,
      stageId: o.stageId,
      dealValue: o.dealValue,
      wonAt: o.wonAt,
      updatedAt: o.updatedAt,
      lastMessage: o.conversation.messages[0]?.content ?? null,
    })),
  });
}
