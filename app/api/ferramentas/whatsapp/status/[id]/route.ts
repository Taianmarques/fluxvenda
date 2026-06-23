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
  const status = await prisma.leadStatus.findFirst({ where: { id, agentConfigId: config.id } });
  if (!status) return NextResponse.json({ error: "Status não encontrado" }, { status: 404 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.leadStatus.update({ where: { id }, data: body.data });

  return NextResponse.json({ status: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const status = await prisma.leadStatus.findFirst({ where: { id, agentConfigId: config.id } });
  if (!status) return NextResponse.json({ error: "Status não encontrado" }, { status: 404 });

  // Conversas com esse status ficam sem status (leadStatusId null) — onDelete: SetNull no schema
  await prisma.leadStatus.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
