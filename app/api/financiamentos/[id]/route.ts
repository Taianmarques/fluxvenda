import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["SIMULADO", "INTERESSE", "ENCAMINHADO", "DESCARTADO"]).optional(),
  notas: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const simulation = await prisma.financingSimulation.findUnique({ where: { id } });
  if (!simulation) return NextResponse.json({ error: "Simulação não encontrada" }, { status: 404 });

  if (!(await userBelongsToAgentConfig(userId, simulation.agentConfigId))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.financingSimulation.update({
    where: { id },
    data: body.data,
  });

  return NextResponse.json({ id: updated.id, status: updated.status, notas: updated.notas });
}
