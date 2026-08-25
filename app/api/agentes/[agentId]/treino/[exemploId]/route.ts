import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { generateEmbedding, buildTreinoEmbeddingText } from "@/lib/embeddings";
import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";

// Escrita restrita ao gestor — o exemplo molda diretamente as respostas da IA
async function findExemplo(userId: string, agentId: string, exemploId: string) {
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return null;
  const exemplo = await prisma.treinoExemplo.findFirst({ where: { id: exemploId, agentConfigId: config.id } });
  if (!exemplo) return null;
  return { config, exemplo };
}

const turnoSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

const patchSchema = z.object({
  cenario: z.string().trim().min(1).max(120).optional(),
  turnos: z.array(turnoSchema).min(1).max(20).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string; exemploId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, exemploId } = await params;
  const found = await findExemplo(userId, agentId, exemploId);
  if (!found) return NextResponse.json({ error: "Exemplo não encontrado" }, { status: 404 });
  const { exemplo } = found;

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  if (body.data.cenario === undefined && body.data.turnos === undefined) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const cenario = body.data.cenario ?? exemplo.cenario;
  const turnos = body.data.turnos ?? (exemplo.turnos as { role: string; content: string }[]);
  const conteudoMudou = body.data.cenario !== undefined || body.data.turnos !== undefined;

  // Conteúdo mudou: o embedding antigo não corresponde mais ao texto — zera até recalcular,
  // pra nunca comparar contra um vetor desatualizado no retrieval
  if (conteudoMudou) {
    await prisma.treinoExemplo.update({ where: { id: exemploId }, data: { cenario, turnos, embedding: Prisma.JsonNull } });
  }

  try {
    const embedding = await generateEmbedding(buildTreinoEmbeddingText(cenario, turnos));
    const updated = await prisma.treinoExemplo.update({ where: { id: exemploId }, data: { embedding } });
    return NextResponse.json({ exemplo: updated });
  } catch (err) {
    console.error("[treino] erro ao gerar embedding:", err);
    const current = await prisma.treinoExemplo.findUnique({ where: { id: exemploId } });
    return NextResponse.json({ exemplo: current });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ agentId: string; exemploId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, exemploId } = await params;
  const found = await findExemplo(userId, agentId, exemploId);
  if (!found) return NextResponse.json({ error: "Exemplo não encontrado" }, { status: 404 });

  await prisma.treinoExemplo.delete({ where: { id: exemploId } });
  return NextResponse.json({ ok: true });
}
