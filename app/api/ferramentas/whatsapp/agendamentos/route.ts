import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isSlotAvailable, type AvailabilityRule } from "@/lib/scheduling";
import { z } from "zod";

async function getOwnAgentConfig(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) return null;
  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return null;
  return prisma.agentConfig.findUnique({ where: { teamId: team.id } });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ appointments: [] });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date();
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date(from.getTime() + 7 * 86400000);

  const appointments = await prisma.appointment.findMany({
    where: { agentConfigId: config.id, scheduledAt: { gte: from, lte: to } },
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
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const scheduledAt = new Date(body.data.scheduledAt);
  const durationMinutes = body.data.durationMinutes ?? config.slotDurationMinutes;

  const busy = await prisma.appointment.findMany({
    where: { agentConfigId: config.id, status: "CONFIRMADO" },
    select: { scheduledAt: true, durationMinutes: true },
  });

  const available = isSlotAvailable(
    config.availability as unknown as AvailabilityRule[],
    durationMinutes,
    busy,
    scheduledAt
  );
  if (!available) return NextResponse.json({ error: "Horário indisponível ou conflita com outro agendamento" }, { status: 409 });

  const appointment = await prisma.appointment.create({
    data: {
      agentConfigId: config.id,
      contactName: body.data.contactName,
      contactNumber: body.data.contactNumber,
      scheduledAt,
      durationMinutes,
      notes: body.data.notes ?? "",
    },
  });

  return NextResponse.json({ appointment });
}
