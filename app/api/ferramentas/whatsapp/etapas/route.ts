import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfig } from "@/lib/team";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ stages: [] });

  const pipelineId = new URL(req.url).searchParams.get("pipelineId");
  if (!pipelineId) return NextResponse.json({ error: "pipelineId é obrigatório" }, { status: 400 });

  const pipeline = await prisma.pipeline.findFirst({ where: { id: pipelineId, agentConfigId: config.id } });
  if (!pipeline) return NextResponse.json({ stages: [] });

  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ stages });
}

const schema = z.object({ pipelineId: z.string().min(1), name: z.string().min(1).max(40), color: z.string().default("#3b82f6") });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const pipeline = await prisma.pipeline.findFirst({ where: { id: body.data.pipelineId, agentConfigId: config.id } });
  if (!pipeline) return NextResponse.json({ error: "Pipeline não encontrado" }, { status: 404 });

  const last = await prisma.pipelineStage.findFirst({ where: { pipelineId: pipeline.id }, orderBy: { order: "desc" } });

  const stage = await prisma.pipelineStage.create({
    data: { pipelineId: pipeline.id, name: body.data.name, color: body.data.color, order: (last?.order ?? -1) + 1 },
  });

  return NextResponse.json({ stage });
}
