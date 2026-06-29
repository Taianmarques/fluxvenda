import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateAgentTemplate } from "@/lib/agent-engine";
import { getAgentConfigAsManager } from "@/lib/team";

// Sugere tom/serviços/objeções/horário de partida com base no setor do agente — não
// persiste nada, só devolve a sugestão pro usuário revisar/editar antes de salvar.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  if (!config.segmento) return NextResponse.json({ error: "Esse agente não tem setor definido" }, { status: 400 });

  const suggestion = await generateAgentTemplate(config.segmento, config.subsegmento);
  return NextResponse.json(suggestion);
}
