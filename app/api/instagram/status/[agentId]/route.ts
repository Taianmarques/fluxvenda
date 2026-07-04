import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const connection = await prisma.instagramConnection.findUnique({
    where: { agentConfigId: agentId },
    select: { instagramUsername: true, instagramBusinessAccountId: true, tokenExpiresAt: true },
  });

  return NextResponse.json({ connection });
}
