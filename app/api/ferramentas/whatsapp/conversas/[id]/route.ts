import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      // Últimas 100 mensagens (desc + take + reverse) — o polling de 3s do chat não pode
      // carregar o histórico inteiro de conversas longas a cada tick
      messages: { orderBy: { createdAt: "desc" }, take: 100, include: { sender: { select: { name: true } } } },
      opportunities: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  conversation.messages.reverse(); // devolve em ordem cronológica

  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  const { isManager } = result;
  if (!isManager && conversation.assignedToId && conversation.assignedToId !== userId) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  // Abrir a conversa marca como lida pra todo mundo (não é por usuário) — usado no filtro
  // "não lidas". Throttle de 30s: o polling de 3s não precisa escrever no banco toda vez.
  if (!conversation.lastReadAt || conversation.lastReadAt < new Date(Date.now() - 30_000)) {
    await prisma.conversation.update({ where: { id }, data: { lastReadAt: new Date() } });
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

  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  const { config, isManager } = result;
  if (!isManager && conversation.assignedToId && conversation.assignedToId !== userId) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  if (body.data.leadStatusId) {
    const status = await prisma.leadStatus.findFirst({ where: { id: body.data.leadStatusId, agentConfigId: config.id } });
    if (!status) return NextResponse.json({ error: "Status não encontrado" }, { status: 404 });
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
