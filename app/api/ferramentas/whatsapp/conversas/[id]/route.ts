import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getOwnAgentConfigWithRole(userId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config, isManager } = result;

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, agentConfigId: config.id },
    include: { messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } } },
  });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  if (!isManager && conversation.assignedToId && conversation.assignedToId !== userId) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

const patchSchema = z.object({
  stageId: z.string().nullable().optional(),
  leadStatusId: z.string().nullable().optional(),
  dealValue: z.number().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
});

// Move a conversa para outra etapa do pipeline, muda o status do lead, o valor negociado e/ou o atendente responsável
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getOwnAgentConfigWithRole(userId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config, isManager } = result;

  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (body.data.stageId) {
    const stage = await prisma.pipelineStage.findFirst({ where: { id: body.data.stageId, pipeline: { agentConfigId: config.id } } });
    if (!stage) return NextResponse.json({ error: "Etapa não encontrada" }, { status: 404 });
  }

  if (body.data.leadStatusId) {
    const status = await prisma.leadStatus.findFirst({ where: { id: body.data.leadStatusId, agentConfigId: config.id } });
    if (!status) return NextResponse.json({ error: "Status não encontrado" }, { status: 404 });
  }

  const conversation = await prisma.conversation.findFirst({ where: { id, agentConfigId: config.id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  if (!isManager && conversation.assignedToId && conversation.assignedToId !== userId) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  if (body.data.assignedToId !== undefined) {
    if (!isManager && body.data.assignedToId !== userId && body.data.assignedToId !== null) {
      return NextResponse.json({ error: "Você só pode assumir a conversa pra você mesmo" }, { status: 403 });
    }
    if (body.data.assignedToId) {
      const member = await prisma.teamMember.findUnique({ where: { profileId: body.data.assignedToId } });
      const isThatProfileManager = config.teamId && (await prisma.team.findUnique({ where: { id: config.teamId } }))?.managerId === body.data.assignedToId;
      if ((!member || member.teamId !== config.teamId) && !isThatProfileManager) {
        return NextResponse.json({ error: "Atendente não encontrado" }, { status: 404 });
      }
    }
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      ...(body.data.stageId !== undefined && { stageId: body.data.stageId }),
      ...(body.data.leadStatusId !== undefined && { leadStatusId: body.data.leadStatusId }),
      ...(body.data.dealValue !== undefined && { dealValue: body.data.dealValue }),
      ...(body.data.assignedToId !== undefined && { assignedToId: body.data.assignedToId }),
    },
  });

  return NextResponse.json({ conversation: updated });
}
