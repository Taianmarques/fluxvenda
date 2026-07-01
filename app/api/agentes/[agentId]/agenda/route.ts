import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  return NextResponse.json({
    schedulingEnabled: config.schedulingEnabled,
    slotDurationMinutes: config.slotDurationMinutes,
    availability: config.availability,
    appointmentReminderHours: config.appointmentReminderHours,
  });
}

const ruleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

const schema = z.object({
  schedulingEnabled: z.boolean().optional(),
  slotDurationMinutes: z.number().int().min(5).max(480).optional(),
  availability: z.array(ruleSchema).optional(),
  appointmentReminderHours: z.number().int().min(1).max(168).optional(),
  requisitosAgendamento: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.agentConfig.update({
    where: { id: config.id },
    data: body.data,
  });

  return NextResponse.json({
    schedulingEnabled: updated.schedulingEnabled,
    slotDurationMinutes: updated.slotDurationMinutes,
    availability: updated.availability,
    appointmentReminderHours: updated.appointmentReminderHours,
  });
}
