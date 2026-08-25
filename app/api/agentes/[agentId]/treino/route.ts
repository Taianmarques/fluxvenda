import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole, getAgentConfigAsManager } from "@/lib/team";
import { generateEmbedding, buildTreinoEmbeddingText } from "@/lib/embeddings";
import { z } from "zod";

const MAX_EXEMPLOS = 100;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ exemplos: [] });

  const exemplos = await prisma.treinoExemplo.findMany({
    where: { agentConfigId: result.config.id },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
  return NextResponse.json({ exemplos });
}

const turnoSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

const schema = z.object({
  cenario: z.string().trim().min(1).max(120),
  turnos: z.array(turnoSchema).min(1).max(20),
});

// Só o gestor cadastra exemplos de treino — moldam diretamente as respostas da IA
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Só o gestor edita os exemplos de treino" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const count = await prisma.treinoExemplo.count({ where: { agentConfigId: config.id } });
  if (count >= MAX_EXEMPLOS) {
    return NextResponse.json({ error: `Limite de ${MAX_EXEMPLOS} exemplos por agente` }, { status: 400 });
  }

  const exemplo = await prisma.treinoExemplo.create({
    data: { agentConfigId: config.id, cenario: body.data.cenario, turnos: body.data.turnos, createdById: userId },
  });

  // Calcula o embedding na mesma requisição, mas nunca deixa uma falha da OpenAI derrubar o
  // salvamento — o exemplo já cadastrado fica só sem embedding até ser reprocessado
  try {
    const embedding = await generateEmbedding(buildTreinoEmbeddingText(body.data.cenario, body.data.turnos));
    const updated = await prisma.treinoExemplo.update({ where: { id: exemplo.id }, data: { embedding } });
    return NextResponse.json({ exemplo: updated });
  } catch (err) {
    console.error("[treino] erro ao gerar embedding:", err);
    return NextResponse.json({ exemplo });
  }
}
