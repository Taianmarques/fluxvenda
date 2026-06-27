import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfigWithRole } from "@/lib/team";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getOwnAgentConfigWithRole(userId);
  if (!result) return NextResponse.json({ conversations: [] });
  const { config, isManager } = result;

  const conversations = await prisma.conversation.findMany({
    where: {
      agentConfigId: config.id,
      // Gestor vê tudo; atendente só vê as dele + as ainda não atribuídas
      ...(isManager ? {} : { OR: [{ assignedToId: userId }, { assignedToId: null }] }),
    },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return NextResponse.json({ conversations });
}
