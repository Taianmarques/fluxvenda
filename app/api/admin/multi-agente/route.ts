import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { FLUXVENDA_TEAM_ID } from "@/lib/internal-agent";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

// Estado atual do agente multi-setor da FluxVenda: departamentos (com a instrução de IA de
// cada um) e o AgentConfig, se já tiver sido criado.
export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [departamentos, agente] = await Promise.all([
    prisma.departamento.findMany({ where: { teamId: FLUXVENDA_TEAM_ID }, orderBy: { createdAt: "asc" } }),
    prisma.agentConfig.findFirst({ where: { teamId: FLUXVENDA_TEAM_ID, multiAgenteDepartamentos: true } }),
  ]);

  return NextResponse.json({
    departamentos: departamentos.map(d => ({ id: d.id, nome: d.nome, descricao: d.descricao, agenteInstrucoes: d.agenteInstrucoes })),
    agente: agente ? { id: agente.id, nome: agente.nome, active: agente.active, systemPrompt: agente.systemPrompt } : null,
  });
}
