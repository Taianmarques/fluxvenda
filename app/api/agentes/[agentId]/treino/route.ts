import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

const turnoSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const schema = z.object({
  cenario: z.string().trim().min(1).max(120),
  turnos: z.array(turnoSchema).min(2).max(60),
});

// Lista as conversas simuladas (roleplay cliente x SDR) cadastradas pra esse agente — matéria
// prima pra um futuro fine-tuning, curada manualmente pelo gestor.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const exemplos = await prisma.trainingExample.findMany({
    where: { agentConfigId: agentId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ exemplos });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  // Turnos devem alternar cliente/SDR, começando pelo cliente — senão o exemplo não serve de
  // treino de resposta (o alvo do fine-tuning é sempre a fala do SDR, role "assistant")
  const turnos = body.data.turnos;
  if (turnos[0].role !== "user") {
    return NextResponse.json({ error: "A conversa deve começar com a fala do cliente" }, { status: 400 });
  }
  for (let i = 1; i < turnos.length; i++) {
    if (turnos[i].role === turnos[i - 1].role) {
      return NextResponse.json({ error: "Os turnos devem alternar entre cliente e SDR" }, { status: 400 });
    }
  }

  const exemplo = await prisma.trainingExample.create({
    data: { agentConfigId: agentId, createdById: userId, cenario: body.data.cenario, turnos: body.data.turnos },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ exemplo });
}
