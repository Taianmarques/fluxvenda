import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { isSlotAvailable, type AvailabilityRule } from "@/lib/scheduling";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ appointments: [] });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date();
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date(from.getTime() + 7 * 86400000);

  const appointments = await prisma.appointment.findMany({
    where: { agentConfigId: agentId, scheduledAt: { gte: from, lte: to } },
    include: { professional: { select: { id: true, name: true } }, service: { select: { id: true, name: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({ appointments });
}

const schema = z.object({
  scheduledAt: z.string(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  contactName: z.string().optional(),
  contactNumber: z.string().min(1),
  notes: z.string().optional(),
  professionalId: z.string().optional(),
  serviceId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config } = result;

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const professional = body.data.professionalId
    ? await prisma.professional.findFirst({ where: { id: body.data.professionalId, agentConfigId: config.id } })
    : null;
  const service = body.data.serviceId
    ? await prisma.service.findFirst({ where: { id: body.data.serviceId, agentConfigId: config.id } })
    : null;

  const scheduledAt = new Date(body.data.scheduledAt);
  const durationMinutes = body.data.durationMinutes ?? service?.durationMinutes ?? config.slotDurationMinutes;

  const busy = await prisma.appointment.findMany({
    where: {
      agentConfigId: config.id,
      status: "CONFIRMADO",
      ...(professional ? { professionalId: professional.id } : {}),
    },
    select: { scheduledAt: true, durationMinutes: true },
  });

  const availability = (professional?.availability ?? config.availability) as unknown as AvailabilityRule[];

  const available = isSlotAvailable(availability, durationMinutes, busy, scheduledAt);
  if (!available) return NextResponse.json({ error: "Horário indisponível ou conflita com outro agendamento" }, { status: 409 });

  const appointment = await prisma.appointment.create({
    data: {
      agentConfigId: config.id,
      contactName: body.data.contactName,
      contactNumber: body.data.contactNumber,
      scheduledAt,
      durationMinutes,
      notes: body.data.notes ?? "",
      professionalId: professional?.id,
      serviceId: service?.id,
    },
  });

  return NextResponse.json({ appointment });
}
