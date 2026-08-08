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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string; id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, id } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const existing = await prisma.trainingExample.findFirst({ where: { id, agentConfigId: agentId } });
  if (!existing) return NextResponse.json({ error: "Exemplo não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const turnos = body.data.turnos;
  if (turnos[0].role !== "user") {
    return NextResponse.json({ error: "A conversa deve começar com a fala do cliente" }, { status: 400 });
  }
  for (let i = 1; i < turnos.length; i++) {
    if (turnos[i].role === turnos[i - 1].role) {
      return NextResponse.json({ error: "Os turnos devem alternar entre cliente e SDR" }, { status: 400 });
    }
  }

  const exemplo = await prisma.trainingExample.update({
    where: { id },
    data: { cenario: body.data.cenario, turnos: body.data.turnos },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ exemplo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ agentId: string; id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, id } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const existing = await prisma.trainingExample.findFirst({ where: { id, agentConfigId: agentId } });
  if (!existing) return NextResponse.json({ error: "Exemplo não encontrado" }, { status: 404 });

  await prisma.trainingExample.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
