import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";

// Pausa o agente: a IA para de responder, mas o WhatsApp continua conectado (sem precisar reconectar depois)
export async function POST(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  await prisma.agentConfig.update({ where: { id: config.id }, data: { active: false } });

  return NextResponse.json({ ok: true });
}
