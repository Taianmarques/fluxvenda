import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

const schema = z.object({
  conversationId: z.string().min(1),
  // null = volta para classificação automática
  nivel: z.enum(["A", "B", "C", "INATIVO", "PERDIDO"]).nullable(),
});

// Override manual do nível da carteira (ex: cliente informou que comprou de outro fornecedor)
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) {
    return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.conversation.updateMany({
    where: { id: body.data.conversationId, agentConfigId: agentId },
    data: { nivelCarteira: body.data.nivel },
  });
  if (updated.count === 0) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
