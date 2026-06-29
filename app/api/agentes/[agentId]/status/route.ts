import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) return NextResponse.json({ statuses: [] });

  const statuses = await prisma.leadStatus.findMany({
    where: { agentConfigId: agentId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ statuses });
}

const schema = z.object({ name: z.string().min(1).max(40), color: z.string().default("#6b7280") });

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const last = await prisma.leadStatus.findFirst({ where: { agentConfigId: agentId }, orderBy: { order: "desc" } });

  const status = await prisma.leadStatus.create({
    data: { agentConfigId: agentId, name: body.data.name, color: body.data.color, order: (last?.order ?? -1) + 1 },
  });

  return NextResponse.json({ status });
}
