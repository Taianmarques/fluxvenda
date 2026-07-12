import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots, type AvailabilityRule } from "@/lib/scheduling";

// Horários livres pra página pública de agendamento — sem auth; tudo validado contra o
// banco e escopado pelo agentConfig resolvido do slug/id da URL.
export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const config = await prisma.agentConfig.findFirst({
    where: { OR: [{ storeSlug: agentId }, { id: agentId }] },
    select: {
      id: true,
      schedulingEnabled: true,
      slotDurationMinutes: true,
      availability: true,
      askProfessionalEnabled: true,
      agendarAteEncerramento: true,
    },
  });
  if (!config?.schedulingEnabled) {
    return NextResponse.json({ error: "Agendamento indisponível" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");
  const professionalId = searchParams.get("professionalId");

  const [service, professionals] = await Promise.all([
    serviceId
      ? prisma.service.findFirst({ where: { id: serviceId, agentConfigId: config.id, active: true } })
      : Promise.resolve(null),
    prisma.professional.findMany({ where: { agentConfigId: config.id, active: true } }),
  ]);
  if (serviceId && !service) return NextResponse.json({ error: "Serviço inválido" }, { status: 400 });

  const durationMinutes = service?.durationMinutes ?? config.slotDurationMinutes;

  // Mesma resolução de profissional do agente de IA (lib/whatsapp-inbound.ts):
  // escolhido na URL > único ativo > união de todos (askProfessionalEnabled=false)
  let professional = professionalId
    ? professionals.find(p => p.id === professionalId) ?? null
    : null;
  if (professionalId && !professional) {
    return NextResponse.json({ error: "Profissional inválido" }, { status: 400 });
  }
  if (!professional && professionals.length === 1) professional = professionals[0];

  if (!professional && professionals.length > 1 && !config.askProfessionalEnabled) {
    // União dos horários de todos os profissionais — quem agendar sem escolher
    // é atribuído ao primeiro livre na hora do POST
    const dayMap = new Map<string, { weekday: string; slots: Set<string> }>();
    for (const pro of professionals) {
      const busy = await prisma.appointment.findMany({
        where: { agentConfigId: config.id, status: "CONFIRMADO", professionalId: pro.id },
        select: { scheduledAt: true, durationMinutes: true },
      });
      const availability = (pro.availability ?? config.availability) as unknown as AvailabilityRule[];
      for (const day of getAvailableSlots(availability, durationMinutes, busy, undefined, undefined, config.agendarAteEncerramento)) {
        const entry = dayMap.get(day.date) ?? { weekday: day.weekday, slots: new Set<string>() };
        for (const s of day.slots) entry.slots.add(s);
        dayMap.set(day.date, entry);
      }
    }
    const days = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { weekday, slots }]) => ({ date, weekday, slots: Array.from(slots).sort() }));
    return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!professional && professionals.length > 1 && config.askProfessionalEnabled) {
    return NextResponse.json({ error: "Escolha um profissional" }, { status: 400 });
  }

  const busy = await prisma.appointment.findMany({
    where: {
      agentConfigId: config.id,
      status: "CONFIRMADO",
      ...(professional ? { professionalId: professional.id } : {}),
    },
    select: { scheduledAt: true, durationMinutes: true },
  });
  const availability = (professional?.availability ?? config.availability) as unknown as AvailabilityRule[];

  const days = getAvailableSlots(availability, durationMinutes, busy, undefined, undefined, config.agendarAteEncerramento);
  return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
}
