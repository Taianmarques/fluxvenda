import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole, negadaParaAtendente } from "@/lib/team";
import { emitChatEvent } from "@/lib/realtime";

// Atendente aceita a conversa: assume o atendimento manual (pausa a IA) e fica responsável por ela
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  const { config, isManager } = result;
  if (!isManager && negadaParaAtendente(conversation, userId, config.iaLeadAttendantId)) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: { humanTakeover: true, status: "ATIVO", assignedToId: userId },
  });
  emitChatEvent(conversation.agentConfigId, id); // some da lista dos colegas na hora, sem esperar o poll

  return NextResponse.json({ conversation: updated });
}
