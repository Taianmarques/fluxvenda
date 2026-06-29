import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service || !(await userBelongsToAgentConfig(userId, service.agentConfigId))) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.service.update({ where: { id }, data: body.data });
  return NextResponse.json({ service: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service || !(await userBelongsToAgentConfig(userId, service.agentConfigId))) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
