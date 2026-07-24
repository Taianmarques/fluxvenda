import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

// Escrita restrita ao gestor — o conteúdo molda o comportamento da IA
async function findItem(userId: string, agentId: string, itemId: string) {
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return null;
  return prisma.conhecimentoItem.findFirst({ where: { id: itemId, agentConfigId: config.id } });
}

const patchSchema = z.object({
  titulo: z.string().trim().min(1).max(80).optional(),
  conteudo: z.string().trim().min(1).max(4000).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string; itemId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, itemId } = await params;
  const item = await findItem(userId, agentId, itemId);
  if (!item) return NextResponse.json({ error: "Conteúdo não encontrado" }, { status: 404 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  await prisma.conhecimentoItem.update({ where: { id: item.id }, data: body.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ agentId: string; itemId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, itemId } = await params;
  const item = await findItem(userId, agentId, itemId);
  if (!item) return NextResponse.json({ error: "Conteúdo não encontrado" }, { status: 404 });

  await prisma.conhecimentoItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
