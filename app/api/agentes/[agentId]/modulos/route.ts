import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

const schema = z.object({
  schedulingEnabled: z.boolean().optional(),
  commerceEnabled: z.boolean().optional(),
  cobrancaEnabled: z.boolean().optional(),
  prospeccaoEnabled: z.boolean().optional(),
  carteiraEnabled: z.boolean().optional(),
  posVendaEnabled: z.boolean().optional(),
  recompraEnabled: z.boolean().optional(),
});

// Liga/desliga os agentes de IA (módulos) a partir do Hub — só gestor
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
