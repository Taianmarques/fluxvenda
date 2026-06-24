export type AvailabilityRule = { dayOfWeek: number; start: string; end: string }; // start/end "HH:mm"

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

// Gera os horários livres dos próximos `days` dias, respeitando as regras de disponibilidade
// e excluindo horários já ocupados por outros agendamentos confirmados.
export function getAvailableSlots(
  availability: AvailabilityRule[],
  slotDurationMinutes: number,
  busy: { scheduledAt: Date; durationMinutes: number }[],
  fromDate: Date = new Date(),
  days = 14
): { date: string; weekday: string; slots: string[] }[] {
  const result: { date: string; weekday: string; slots: string[] }[] = [];
  const now = new Date();

  for (let d = 0; d < days; d++) {
    const day = new Date(fromDate);
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);
    const dayOfWeek = day.getDay();

    const rules = availability.filter(r => r.dayOfWeek === dayOfWeek);
    if (rules.length === 0) continue;

    const slots: string[] = [];
    for (const rule of rules) {
      const startMin = parseTime(rule.start);
      const endMin = parseTime(rule.end);
      for (let t = startMin; t + slotDurationMinutes <= endMin; t += slotDurationMinutes) {
        const slotStart = new Date(day);
        slotStart.setMinutes(t);
        if (slotStart <= now) continue; // não oferece horário no passado

        const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60000);
        const conflict = busy.some(b => {
          const bStart = b.scheduledAt;
          const bEnd = new Date(bStart.getTime() + b.durationMinutes * 60000);
          return slotStart < bEnd && slotEnd > bStart;
        });
        if (!conflict) slots.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
      }
    }

    if (slots.length > 0) {
      result.push({
        date: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`,
        weekday: DIAS_SEMANA[dayOfWeek],
        slots,
      });
    }
  }

  return result;
}

export function isSlotAvailable(
  availability: AvailabilityRule[],
  slotDurationMinutes: number,
  busy: { scheduledAt: Date; durationMinutes: number }[],
  scheduledAt: Date
): boolean {
  const dayOfWeek = scheduledAt.getDay();
  const minutesOfDay = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();

  const withinRule = availability.some(r => {
    if (r.dayOfWeek !== dayOfWeek) return false;
    return minutesOfDay >= parseTime(r.start) && minutesOfDay + slotDurationMinutes <= parseTime(r.end);
  });
  if (!withinRule) return false;
  if (scheduledAt <= new Date()) return false;

  const slotEnd = new Date(scheduledAt.getTime() + slotDurationMinutes * 60000);
  const conflict = busy.some(b => {
    const bStart = b.scheduledAt;
    const bEnd = new Date(bStart.getTime() + b.durationMinutes * 60000);
    return scheduledAt < bEnd && slotEnd > bStart;
  });
  return !conflict;
}

// Resumo compacto para o modelo: poucos dias, poucos horários por dia. O objetivo é dar
// contexto suficiente pra IA conversar naturalmente, sem ela despejar a lista inteira no cliente.
export function formatSlotsForAgent(slots: { date: string; weekday: string; slots: string[] }[]): string {
  if (slots.length === 0) return "Não há horários disponíveis no período consultado.";
  return slots
    .slice(0, 5)
    .map(s => {
      const preview = s.slots.slice(0, 4).join(", ");
      const extra = s.slots.length > 4 ? ` (e mais ${s.slots.length - 4} horários nesse dia)` : "";
      return `${s.date} (${s.weekday}): ${preview}${extra}`;
    })
    .join("\n");
}
