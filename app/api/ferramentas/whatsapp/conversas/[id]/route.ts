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
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
      opportunities: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  if (!isManager && conversation.assignedToId && conversation.assignedToId !== userId) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

const patchSchema = z.object({
  leadStatusId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  status: z.enum(["ATIVO", "AGUARDANDO", "FINALIZADO"]).optional(),
});

// Muda o status do lead, o status da conversa e/ou o atendente responsável.
// Etapa do pipeline e valor negociado agora vivem em Opportunity, não aqui.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getOwnAgentConfigWithRole(userId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config, isManager } = result;

  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (body.data.leadStatusId) {
    const status = await prisma.leadStatus.findFirst({ where: { id: body.data.leadStatusId, agentConfigId: config.id } });
    if (!status) return NextResponse.json({ error: "Status não encontrado" }, { status: 404 });
  }

  const conversation = await prisma.conversation.findFirst({ where: { id, agentConfigId: config.id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  if (!isManager && conversation.assignedToId && conversation.assignedToId !== userId) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  // Transferir: qualquer pessoa da equipe (gestor ou atendente) pode passar a conversa pra
  // outro membro válido da mesma equipe — só valida que o destino realmente faz parte dela.
  if (body.data.assignedToId) {
    const member = await prisma.teamMember.findUnique({ where: { profileId: body.data.assignedToId } });
    const team = await prisma.team.findUnique({ where: { id: config.teamId } });
    const isThatProfileManager = team?.managerId === body.data.assignedToId;
    if ((!member || member.teamId !== config.teamId) && !isThatProfileManager) {
      return NextResponse.json({ error: "Atendente não encontrado" }, { status: 404 });
    }
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      ...(body.data.leadStatusId !== undefined && { leadStatusId: body.data.leadStatusId }),
      ...(body.data.assignedToId !== undefined && { assignedToId: body.data.assignedToId }),
      ...(body.data.status !== undefined && { status: body.data.status }),
    },
  });

  return NextResponse.json({ conversation: updated });
}
