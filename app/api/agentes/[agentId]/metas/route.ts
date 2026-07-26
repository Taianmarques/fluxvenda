import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  return NextResponse.json({
    metaGeralMensal: config.metaGeralMensal,
    metasPorVendedor: config.metasPorVendedor,
  });
}

const schema = z.object({
  metaGeralMensal: z.number().min(0),
  metasPorVendedor: z.record(z.string(), z.number().min(0)),
});

// Metas mensais (geral + por vendedor) — reiniciam todo mês, comparadas ao valor ganho no mês
// corrente nos dashboards. Não têm histórico: o mesmo valor vale até o gestor mudar de novo.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.agentConfig.update({
    where: { id: config.id },
    data: { metaGeralMensal: body.data.metaGeralMensal, metasPorVendedor: body.data.metasPorVendedor },
  });

  return NextResponse.json({ metaGeralMensal: updated.metaGeralMensal, metasPorVendedor: updated.metasPorVendedor });
}
