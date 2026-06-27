import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfig } from "@/lib/team";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ statuses: [] });

  const statuses = await prisma.leadStatus.findMany({
    where: { agentConfigId: config.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ statuses });
}

const schema = z.object({ name: z.string().min(1).max(40), color: z.string().default("#6b7280") });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const last = await prisma.leadStatus.findFirst({ where: { agentConfigId: config.id }, orderBy: { order: "desc" } });

  const status = await prisma.leadStatus.create({
    data: { agentConfigId: config.id, name: body.data.name, color: body.data.color, order: (last?.order ?? -1) + 1 },
  });

  return NextResponse.json({ status });
}
