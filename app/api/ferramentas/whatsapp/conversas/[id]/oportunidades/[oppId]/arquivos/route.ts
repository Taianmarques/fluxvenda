import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

const MAX_BASE64_LENGTH = 7_000_000; // ~5MB de arquivo original (base64 é ~33% maior)

async function loadOpportunity(id: string, oppId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return null;
  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return null;
  if (!result.isManager && conversation.assignedToId && conversation.assignedToId !== userId) return null;
  const opportunity = await prisma.opportunity.findFirst({ where: { id: oppId, conversationId: id } });
  if (!opportunity) return null;
  return { opportunity, config: result.config };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, oppId } = await params;
  const loaded = await loadOpportunity(id, oppId, userId);
  if (!loaded) return NextResponse.json({ files: [] });

  const files = await prisma.opportunityFile.findMany({
    where: { opportunityId: oppId },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, mimeType: true, createdAt: true, uploadedBy: { select: { name: true } } },
  });

  return NextResponse.json({ files });
}

const createSchema = z.object({
  fileName: z.string().trim().min(1).max(150),
  mimeType: z.string().trim().min(1).max(100),
  base64: z.string().min(1),
});

// Arquivo interno (contrato, documento, print) anexado à oportunidade — nunca é enviado ao
// cliente pelo WhatsApp, só visível pra equipe na aba Arquivos do modal de detalhes.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, oppId } = await params;
  const loaded = await loadOpportunity(id, oppId, userId);
  if (!loaded) return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (body.data.base64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "Arquivo muito grande — o limite é 5MB" }, { status: 400 });
  }

  const file = await prisma.opportunityFile.create({
    data: {
      opportunityId: oppId,
      fileName: body.data.fileName,
      mimeType: body.data.mimeType,
      base64: body.data.base64,
      uploadedById: userId,
    },
    select: { id: true, fileName: true, mimeType: true, createdAt: true, uploadedBy: { select: { name: true } } },
  });

  return NextResponse.json({ file });
}
