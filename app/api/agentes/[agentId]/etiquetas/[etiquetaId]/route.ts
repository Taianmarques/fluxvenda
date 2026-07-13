import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

async function findEtiqueta(userId: string, agentId: string, etiquetaId: string) {
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return null;
  return prisma.etiqueta.findFirst({ where: { id: etiquetaId, agentConfigId: result.config.id } });
}

const patchSchema = z.object({
  nome: z.string().trim().min(1).max(40).optional(),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string; etiquetaId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, etiquetaId } = await params;
  const etiqueta = await findEtiqueta(userId, agentId, etiquetaId);
  if (!etiqueta) return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 404 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  await prisma.etiqueta.update({ where: { id: etiqueta.id }, data: body.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ agentId: string; etiquetaId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, etiquetaId } = await params;
  const etiqueta = await findEtiqueta(userId, agentId, etiquetaId);
  if (!etiqueta) return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 404 });

  await prisma.etiqueta.delete({ where: { id: etiqueta.id } });
  return NextResponse.json({ ok: true });
}
