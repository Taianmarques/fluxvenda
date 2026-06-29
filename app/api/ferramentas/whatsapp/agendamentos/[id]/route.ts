import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["CONFIRMADO", "CANCELADO", "CONCLUIDO"]).optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment || !(await userBelongsToAgentConfig(userId, appointment.agentConfigId))) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...(body.data.status && { status: body.data.status }),
      ...(body.data.scheduledAt && { scheduledAt: new Date(body.data.scheduledAt) }),
      ...(body.data.notes !== undefined && { notes: body.data.notes }),
    },
  });

  return NextResponse.json({ appointment: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment || !(await userBelongsToAgentConfig(userId, appointment.agentConfigId))) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  await prisma.appointment.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
