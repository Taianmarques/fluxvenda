import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ etiquetas: [] });

  const etiquetas = await prisma.etiqueta.findMany({
    where: { agentConfigId: result.config.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { conversations: true } } },
  });
  return NextResponse.json({
    etiquetas: etiquetas.map(e => ({ id: e.id, nome: e.nome, cor: e.cor, contatos: e._count.conversations })),
  });
}

const schema = z.object({
  nome: z.string().trim().min(1).max(40),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6b7280"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const etiqueta = await prisma.etiqueta.create({
    data: { agentConfigId: result.config.id, nome: body.data.nome, cor: body.data.cor },
  });
  return NextResponse.json({ etiqueta });
}
