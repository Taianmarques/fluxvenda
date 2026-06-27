import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfig } from "@/lib/team";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  color: z.string().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const stage = await prisma.pipelineStage.findFirst({ where: { id, pipeline: { agentConfigId: config.id } } });
  if (!stage) return NextResponse.json({ error: "Etapa não encontrada" }, { status: 404 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.pipelineStage.update({ where: { id }, data: body.data });

  return NextResponse.json({ stage: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const stage = await prisma.pipelineStage.findFirst({ where: { id, pipeline: { agentConfigId: config.id } } });
  if (!stage) return NextResponse.json({ error: "Etapa não encontrada" }, { status: 404 });

  // Conversas dessa etapa ficam sem etapa (stageId null) — onDelete: SetNull no schema
  await prisma.pipelineStage.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
