import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfig } from "@/lib/team";
import { DEFAULT_STAGES } from "@/lib/pipeline";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ pipelines: [] });

  const pipelines = await prisma.pipeline.findMany({
    where: { agentConfigId: config.id },
    orderBy: { order: "asc" },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ pipelines });
}

const schema = z.object({ name: z.string().min(1).max(40) });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const last = await prisma.pipeline.findFirst({ where: { agentConfigId: config.id }, orderBy: { order: "desc" } });

  const pipeline = await prisma.pipeline.create({
    data: { agentConfigId: config.id, name: body.data.name, order: (last?.order ?? -1) + 1 },
  });

  // Novo pipeline já nasce com as etapas padrão, pra ficar usável de imediato
  await prisma.pipelineStage.createMany({
    data: DEFAULT_STAGES.map((s, i) => ({ pipelineId: pipeline.id, name: s.name, color: s.color, order: i })),
  });

  const withStages = await prisma.pipeline.findUnique({ where: { id: pipeline.id }, include: { stages: { orderBy: { order: "asc" } } } });

  return NextResponse.json({ pipeline: withStages });
}
