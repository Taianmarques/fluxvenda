import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/server";
import { listMyAgentConfigs } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/scheduling";
import { DEMO_AVAILABILITY, DEMO_SLOT_MINUTES, DEMO_SLOTS_WINDOW_DAYS } from "@/lib/demo-scheduling";

// Horários livres pra agendar demonstração — só gestor (mesma regra de quem vê a página
// de início / aba Recursos, ver app/(app)/crm/hub/inicio/page.tsx).
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await listMyAgentConfigs(user.id);
  if (!result?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const busy = await prisma.demoBooking.findMany({
    where: { status: "AGENDADO", scheduledAt: { gte: new Date() } },
    select: { scheduledAt: true, durationMinutes: true },
  });

  const slots = getAvailableSlots(DEMO_AVAILABILITY, DEMO_SLOT_MINUTES, busy, new Date(), DEMO_SLOTS_WINDOW_DAYS);
  return NextResponse.json({ slots });
}
