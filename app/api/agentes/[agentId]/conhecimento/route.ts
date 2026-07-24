import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole, getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

const MAX_ITENS = 20;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ itens: [] });

  const itens = await prisma.conhecimentoItem.findMany({
    where: { agentConfigId: result.config.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, titulo: true, conteudo: true, active: true, createdAt: true },
  });
  return NextResponse.json({ itens });
}

const schema = z.object({
  titulo: z.string().trim().min(1).max(80),
  conteudo: z.string().trim().min(1).max(4000),
});

// Só o gestor escreve — o conteúdo molda o comportamento da IA
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Só o gestor edita o conhecimento da IA" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const count = await prisma.conhecimentoItem.count({ where: { agentConfigId: config.id } });
  if (count >= MAX_ITENS) {
    return NextResponse.json({ error: `Limite de ${MAX_ITENS} conteúdos por agente` }, { status: 400 });
  }

  const item = await prisma.conhecimentoItem.create({
    data: { agentConfigId: config.id, titulo: body.data.titulo, conteudo: body.data.conteudo },
  });
  return NextResponse.json({ item });
}
