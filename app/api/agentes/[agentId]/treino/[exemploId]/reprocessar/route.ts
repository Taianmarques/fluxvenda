import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { generateEmbedding, buildTreinoEmbeddingText } from "@/lib/embeddings";

// Tenta gerar o embedding de novo pra um exemplo que ficou sem (falha anterior na OpenAI) —
// não muda cenário/turnos, só recalcula em cima do que já está salvo
export async function POST(_req: NextRequest, { params }: { params: Promise<{ agentId: string; exemploId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, exemploId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Exemplo não encontrado" }, { status: 404 });

  const exemplo = await prisma.treinoExemplo.findFirst({ where: { id: exemploId, agentConfigId: config.id } });
  if (!exemplo) return NextResponse.json({ error: "Exemplo não encontrado" }, { status: 404 });

  try {
    const turnos = exemplo.turnos as { role: string; content: string }[];
    const embedding = await generateEmbedding(buildTreinoEmbeddingText(exemplo.cenario, turnos));
    const updated = await prisma.treinoExemplo.update({ where: { id: exemploId }, data: { embedding } });
    return NextResponse.json({ exemplo: updated });
  } catch (err) {
    console.error("[treino] erro ao reprocessar embedding:", err);
    return NextResponse.json({ error: "Não foi possível gerar o embedding agora. Tente de novo em instantes." }, { status: 502 });
  }
}
