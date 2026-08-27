import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/server";
import { listMyAgentConfigs } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { getDemoSlotDays, DEMO_SLOTS_WINDOW_DAYS, DEFAULT_DEMO_TIMES } from "@/lib/demo-scheduling";

// Horários livres pra agendar demonstração — só gestor (mesma regra de quem vê a página
// de início / aba Recursos, ver app/(app)/crm/hub/inicio/page.tsx).
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await listMyAgentConfigs(user.id);
  if (!result?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [settings, busy] = await Promise.all([
    prisma.platformSettings.findUnique({ where: { id: "singleton" }, select: { demoAvailableTimes: true } }),
    prisma.demoBooking.findMany({
      where: { status: "AGENDADO", scheduledAt: { gte: new Date() } },
      select: { scheduledAt: true, durationMinutes: true },
    }),
  ]);

  const times = settings?.demoAvailableTimes ?? DEFAULT_DEMO_TIMES;
  const slots = getDemoSlotDays(times, busy, new Date(), DEMO_SLOTS_WINDOW_DAYS);
  return NextResponse.json({ slots });
}
