import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

const schema = z.object({
  financingEnabled: z.boolean().optional(),
  bvClientId: z.string().optional(),
  bvClientSecret: z.string().optional(),
  bvSandbox: z.boolean().optional(),
});

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
    data: body.data,
  });

  return NextResponse.json({
    financingEnabled: updated.financingEnabled,
    bvSandbox: updated.bvSandbox,
    hasBvCredentials: !!(updated.bvClientId && updated.bvClientSecret),
  });
}
