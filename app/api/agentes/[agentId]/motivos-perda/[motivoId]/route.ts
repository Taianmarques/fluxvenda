import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

// Escrita restrita ao gestor (ou co-gestor)
async function findMotivo(userId: string, agentId: string, motivoId: string) {
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result || !result.isManager) return null;
  return prisma.motivoPerda.findFirst({ where: { id: motivoId, agentConfigId: result.config.id } });
}

const patchSchema = z.object({
  nome: z.string().trim().min(1, { message: "Informe o nome." }).max(60),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string; motivoId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, motivoId } = await params;
  const motivo = await findMotivo(userId, agentId, motivoId);
  if (!motivo) return NextResponse.json({ error: "Motivo não encontrado" }, { status: 404 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  await prisma.motivoPerda.update({ where: { id: motivo.id }, data: body.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ agentId: string; motivoId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, motivoId } = await params;
  const motivo = await findMotivo(userId, agentId, motivoId);
  if (!motivo) return NextResponse.json({ error: "Motivo não encontrado" }, { status: 404 });

  // Negociações que usavam esse motivo ficam sem motivo (SetNull no schema)
  await prisma.motivoPerda.delete({ where: { id: motivo.id } });
  return NextResponse.json({ ok: true });
}
