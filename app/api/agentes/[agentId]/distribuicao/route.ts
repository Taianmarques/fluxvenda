import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAgentConfigAsManager } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  leadDistributionMode: z.enum(["MANUAL", "PRIMEIRO_A_ASSUMIR", "RODIZIO", "IA_QUALIFICACAO"]),
});

// Só o gestor configura como os leads são distribuídos entre os atendentes da equipe
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
    data: { leadDistributionMode: body.data.leadDistributionMode },
  });

  return NextResponse.json({ leadDistributionMode: updated.leadDistributionMode });
}
