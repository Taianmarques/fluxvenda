import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";

async function loadFile(id: string, oppId: string, fileId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return null;
  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return null;
  if (!result.isManager && conversation.assignedToId && conversation.assignedToId !== userId) return null;
  const file = await prisma.opportunityFile.findFirst({
    where: { id: fileId, opportunityId: oppId, opportunity: { conversationId: id } },
  });
  if (!file) return null;
  return file;
}

// Conteúdo completo (base64) — separado da listagem pra não pesar o GET da lista com o
// arquivo inteiro de cada item; só busca quando o usuário abre/baixa um arquivo específico.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string; fileId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, oppId, fileId } = await params;
  const file = await loadFile(id, oppId, fileId, userId);
  if (!file) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });

  return NextResponse.json({ file });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string; fileId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, oppId, fileId } = await params;
  const file = await loadFile(id, oppId, fileId, userId);
  if (!file) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });

  await prisma.opportunityFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
}
