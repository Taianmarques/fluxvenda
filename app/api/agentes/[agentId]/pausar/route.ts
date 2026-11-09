import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";

// Desliga o agente em todos os canais: nada automático responde, mas os canais continuam conectados
// e as mensagens continuam entrando no CRM. Para pausar um canal só, ver pausar-ia.
export async function POST(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  await prisma.agentConfig.update({ where: { id: config.id }, data: { active: false } });

  return NextResponse.json({ ok: true });
}
