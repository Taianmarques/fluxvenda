import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

const schema = z.object({ content: z.string().min(1).max(2000) });

// Nota interna: visível só pra equipe no CRM, nunca é enviada ao cliente nem entra no
// contexto da IA. Não muda humanTakeover/status — é só uma anotação na conversa.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getOwnAgentConfigWithRole(userId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config, isManager } = result;

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({ where: { id, agentConfigId: config.id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  if (!isManager && conversation.assignedToId && conversation.assignedToId !== userId) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const message = await prisma.message.create({
    data: { conversationId: id, role: "note", content: body.data.content, senderId: userId },
  });

  return NextResponse.json({ message });
}
