import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfig } from "@/lib/team";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  order: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const pipeline = await prisma.pipeline.findFirst({ where: { id, agentConfigId: config.id } });
  if (!pipeline) return NextResponse.json({ error: "Pipeline não encontrado" }, { status: 404 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.pipeline.update({ where: { id }, data: body.data });

  return NextResponse.json({ pipeline: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const pipeline = await prisma.pipeline.findFirst({ where: { id, agentConfigId: config.id } });
  if (!pipeline) return NextResponse.json({ error: "Pipeline não encontrado" }, { status: 404 });

  const count = await prisma.pipeline.count({ where: { agentConfigId: config.id } });
  if (count <= 1) return NextResponse.json({ error: "Não é possível excluir o único pipeline" }, { status: 400 });

  // Etapas desse pipeline são removidas em cascata; conversas dessas etapas ficam sem etapa (stageId null)
  await prisma.pipeline.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
