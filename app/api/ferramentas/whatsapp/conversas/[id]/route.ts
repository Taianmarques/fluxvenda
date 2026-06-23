import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getOwnAgentConfig(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) return null;
  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return null;
  return prisma.agentConfig.findUnique({ where: { teamId: team.id } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, agentConfigId: config.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  return NextResponse.json({ conversation });
}

const patchSchema = z.object({
  stageId: z.string().nullable().optional(),
  dealValue: z.number().nullable().optional(),
});

// Move a conversa para outra etapa do pipeline e/ou atualiza o valor negociado
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (body.data.stageId) {
    const stage = await prisma.pipelineStage.findFirst({ where: { id: body.data.stageId, agentConfigId: config.id } });
    if (!stage) return NextResponse.json({ error: "Etapa não encontrada" }, { status: 404 });
  }

  const conversation = await prisma.conversation.findFirst({ where: { id, agentConfigId: config.id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      ...(body.data.stageId !== undefined && { stageId: body.data.stageId }),
      ...(body.data.dealValue !== undefined && { dealValue: body.data.dealValue }),
    },
  });

  return NextResponse.json({ conversation: updated });
}
