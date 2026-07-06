import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

const schema = z.object({
  carteiraEnabled: z.boolean().optional(),
  posVendaEnabled: z.boolean().optional(),
  posVendaDelayHours: z.number().int().min(1).max(168).optional(),
  posVendaMensagem: z.string().max(1000).optional(),
  recompraEnabled: z.boolean().optional(),
  recompraDias: z.number().int().min(3).max(180).optional(),
  carteiraInstrucoes: z.string().max(1000).optional(),
  carteiraInativoDias: z.number().int().refine(v => [15, 30, 60, 90, 120].includes(v)).optional(),
  posVendaPesquisaEnabled: z.boolean().optional(),
  posVendaReviewLink: z.string().max(300).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  await prisma.agentConfig.update({ where: { id: config.id }, data: body.data });
  return NextResponse.json({ ok: true });
}
