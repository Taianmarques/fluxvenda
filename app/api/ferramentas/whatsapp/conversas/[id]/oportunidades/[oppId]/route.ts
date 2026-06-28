import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

async function loadOpportunity(id: string, oppId: string, config: { id: string }, userId: string, isManager: boolean) {
  const conversation = await prisma.conversation.findFirst({ where: { id, agentConfigId: config.id } });
  if (!conversation) return null;
  if (!isManager && conversation.assignedToId && conversation.assignedToId !== userId) return null;
  const opportunity = await prisma.opportunity.findFirst({ where: { id: oppId, conversationId: id } });
  if (!opportunity) return null;
  return opportunity;
}

const patchSchema = z.object({
  title: z.string().max(60).nullable().optional(),
  dealValue: z.number().positive().optional(),
  stageId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getOwnAgentConfigWithRole(userId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config, isManager } = result;

  const { id, oppId } = await params;
  const opportunity = await loadOpportunity(id, oppId, config, userId, isManager);
  if (!opportunity) return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (body.data.stageId) {
    const stage = await prisma.pipelineStage.findFirst({ where: { id: body.data.stageId, pipeline: { agentConfigId: config.id } } });
    if (!stage) return NextResponse.json({ error: "Etapa não encontrada" }, { status: 404 });
  }

  const updated = await prisma.opportunity.update({
    where: { id: oppId },
    data: {
      ...(body.data.title !== undefined && { title: body.data.title }),
      ...(body.data.dealValue !== undefined && { dealValue: body.data.dealValue }),
      ...(body.data.stageId !== undefined && { stageId: body.data.stageId }),
    },
  });

  return NextResponse.json({ opportunity: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getOwnAgentConfigWithRole(userId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config, isManager } = result;

  const { id, oppId } = await params;
  const opportunity = await loadOpportunity(id, oppId, config, userId, isManager);
  if (!opportunity) return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 });

  await prisma.opportunity.delete({ where: { id: oppId } });
  return NextResponse.json({ ok: true });
}
