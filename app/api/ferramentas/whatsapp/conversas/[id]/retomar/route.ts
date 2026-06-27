import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfig } from "@/lib/team";

// Devolve a conversa para o agente de IA responder automaticamente de novo
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({ where: { id, agentConfigId: config.id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  await prisma.conversation.update({ where: { id }, data: { humanTakeover: false } });

  return NextResponse.json({ ok: true });
}
