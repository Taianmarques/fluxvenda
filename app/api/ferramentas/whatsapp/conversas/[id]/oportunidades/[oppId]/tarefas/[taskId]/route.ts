import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

async function loadTask(id: string, oppId: string, taskId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return null;
  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return null;
  if (!result.isManager && conversation.assignedToId && conversation.assignedToId !== userId) return null;
  const task = await prisma.opportunityTask.findFirst({
    where: { id: taskId, opportunityId: oppId, opportunity: { conversationId: id } },
  });
  if (!task) return null;
  return task;
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  done: z.boolean().optional(),
  dueDate: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string; taskId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, oppId, taskId } = await params;
  const task = await loadTask(id, oppId, taskId, userId);
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.opportunityTask.update({
    where: { id: taskId },
    data: {
      ...(body.data.title !== undefined && { title: body.data.title }),
      ...(body.data.done !== undefined && { done: body.data.done }),
      ...(body.data.dueDate !== undefined && { dueDate: body.data.dueDate ? new Date(body.data.dueDate) : null }),
      ...(body.data.assignedToId !== undefined && { assignedToId: body.data.assignedToId }),
    },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ task: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string; taskId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, oppId, taskId } = await params;
  const task = await loadTask(id, oppId, taskId, userId);
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  await prisma.opportunityTask.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
