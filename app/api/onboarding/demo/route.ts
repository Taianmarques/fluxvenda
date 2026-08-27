import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/server";
import { listMyAgentConfigs } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { isDemoSlotAvailable, DEMO_SLOT_MINUTES, DEFAULT_DEMO_TIMES } from "@/lib/demo-scheduling";
import { sendDemoBookingNotification } from "@/lib/email";

// date/time separados (não um datetime ISO já combinado) — o cliente não sabe o fuso do
// servidor; o servidor monta o Date na hora local dele (America/Sao_Paulo, ver
// instrumentation.ts), mesmo padrão já usado em app/api/agendar/[agentId]/route.ts.
const schema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/) });

// Cria o agendamento de demonstração. Revalida disponibilidade no servidor (a lista de
// horários da tela pode estar levemente desatualizada) antes de gravar.
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await listMyAgentConfigs(user.id);
  if (!result?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const scheduledAt = new Date(`${body.data.date}T${body.data.time}:00`);

  const [settings, busy] = await Promise.all([
    prisma.platformSettings.findUnique({ where: { id: "singleton" }, select: { demoAvailableTimes: true } }),
    prisma.demoBooking.findMany({
      where: { status: "AGENDADO", scheduledAt: { gte: new Date() } },
      select: { scheduledAt: true, durationMinutes: true },
    }),
  ]);
  const times = settings?.demoAvailableTimes ?? DEFAULT_DEMO_TIMES;

  if (!isDemoSlotAvailable(times, busy, scheduledAt)) {
    return NextResponse.json({ error: "Esse horário não está mais disponível" }, { status: 409 });
  }

  const [team, profile] = await Promise.all([
    prisma.team.findUniqueOrThrow({ where: { id: result.teamId }, select: { name: true } }),
    prisma.profile.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true } }),
  ]);

  const booking = await prisma.demoBooking.create({
    data: { teamId: result.teamId, requestedById: user.id, scheduledAt, durationMinutes: DEMO_SLOT_MINUTES },
  });

  sendDemoBookingNotification(team.name, profile.name, profile.email, scheduledAt).catch(() => {});

  return NextResponse.json({ booking });
}
