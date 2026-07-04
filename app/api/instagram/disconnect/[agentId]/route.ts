import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { unsubscribeInstagramWebhook } from "@/lib/instagram";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const connection = await prisma.instagramConnection.findUnique({ where: { agentConfigId: agentId } });
  if (!connection) return NextResponse.json({ ok: true });

  await unsubscribeInstagramWebhook(connection.pageId, connection.pageAccessToken);
  await prisma.instagramConnection.delete({ where: { agentConfigId: agentId } });

  return NextResponse.json({ ok: true });
}
