import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

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
  if (!loaded) return NextResponse.json({ tasks: [] });

  const tasks = await prisma.opportunityTask.findMany({
    where: { opportunityId: oppId },
    orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ tasks });
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  dueDate: z.string().nullable().optional(), // yyyy-mm-dd
  assignedToId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, oppId } = await params;
  const loaded = await loadOpportunity(id, oppId, userId);
  if (!loaded) return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const task = await prisma.opportunityTask.create({
    data: {
      opportunityId: oppId,
      title: body.data.title,
      dueDate: body.data.dueDate ? new Date(body.data.dueDate) : null,
      assignedToId: body.data.assignedToId || null,
    },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ task });
}
