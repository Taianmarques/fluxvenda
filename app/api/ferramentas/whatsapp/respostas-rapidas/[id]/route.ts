import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfig } from "@/lib/team";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(1).max(40).optional(),
  content: z.string().min(1).max(2000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const quickReply = await prisma.quickReply.findFirst({ where: { id, agentConfigId: config.id } });
  if (!quickReply) return NextResponse.json({ error: "Resposta rápida não encontrada" }, { status: 404 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.quickReply.update({ where: { id }, data: body.data });
  return NextResponse.json({ quickReply: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const quickReply = await prisma.quickReply.findFirst({ where: { id, agentConfigId: config.id } });
  if (!quickReply) return NextResponse.json({ error: "Resposta rápida não encontrada" }, { status: 404 });

  await prisma.quickReply.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
