import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfig } from "@/lib/team";
import { z } from "zod";

const ruleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  availability: z.array(ruleSchema).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const professional = await prisma.professional.findFirst({ where: { id, agentConfigId: config.id } });
  if (!professional) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.professional.update({ where: { id }, data: body.data });
  return NextResponse.json({ professional: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const professional = await prisma.professional.findFirst({ where: { id, agentConfigId: config.id } });
  if (!professional) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });

  await prisma.professional.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
