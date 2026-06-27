import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfig } from "@/lib/team";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ services: [] });

  const services = await prisma.service.findMany({
    where: { agentConfigId: config.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ services });
}

const schema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().int().min(5).max(480),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const service = await prisma.service.create({
    data: { agentConfigId: config.id, name: body.data.name, durationMinutes: body.data.durationMinutes },
  });

  return NextResponse.json({ service });
}
