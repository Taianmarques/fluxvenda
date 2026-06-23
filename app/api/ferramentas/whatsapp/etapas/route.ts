import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getOwnAgentConfig(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) return null;
  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return null;
  return prisma.agentConfig.findUnique({ where: { teamId: team.id } });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ stages: [] });

  const stages = await prisma.pipelineStage.findMany({
    where: { agentConfigId: config.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ stages });
}

const schema = z.object({ name: z.string().min(1).max(40), color: z.string().default("#3b82f6") });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const last = await prisma.pipelineStage.findFirst({ where: { agentConfigId: config.id }, orderBy: { order: "desc" } });

  const stage = await prisma.pipelineStage.create({
    data: { agentConfigId: config.id, name: body.data.name, color: body.data.color, order: (last?.order ?? -1) + 1 },
  });

  return NextResponse.json({ stage });
}
