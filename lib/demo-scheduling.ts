// Agenda da demonstração do CRM: dias fixos seg-sex, mas os horários do dia (ex: "2 pela
// manhã e 2 pela tarde") são uma lista curta e explícita — não um range contínuo gerado a
// cada N minutos como lib/scheduling.ts faz pros agendamentos públicos — porque aqui o
// objetivo é oferecer poucos horários fixos, editáveis pelo super admin (PlatformSettings.
// demoAvailableTimes), não a agenda cheia de um profissional.

export const DEMO_SLOT_MINUTES = 40;
export const DEMO_SLOTS_WINDOW_DAYS = 60;
export const DEFAULT_DEMO_TIMES = ["09:00", "11:00", "14:00", "16:00"];

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function isBusy(slotStart: Date, busy: { scheduledAt: Date; durationMinutes: number }[]): boolean {
  const slotEnd = new Date(slotStart.getTime() + DEMO_SLOT_MINUTES * 60000);
  return busy.some(b => {
    const bStart = b.scheduledAt;
    const bEnd = new Date(bStart.getTime() + b.durationMinutes * 60000);
    return slotStart < bEnd && slotEnd > bStart;
  });
}

// Lista os próximos `days` dias úteis (seg-sex) com os horários de `times` que ainda estão
// livres (não passaram e não colidem com outro agendamento confirmado).
export function getDemoSlotDays(
  times: string[],
  busy: { scheduledAt: Date; durationMinutes: number }[],
  fromDate: Date = new Date(),
  days = DEMO_SLOTS_WINDOW_DAYS
): { date: string; weekday: string; slots: string[] }[] {
  const result: { date: string; weekday: string; slots: string[] }[] = [];
  const now = new Date();

  for (let d = 0; d < days; d++) {
    const day = new Date(fromDate);
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const slots: string[] = [];
    for (const time of times) {
      const [h, m] = time.split(":").map(Number);
      const slotStart = new Date(day);
      slotStart.setHours(h, m, 0, 0);
      if (slotStart <= now) continue;
      if (!isBusy(slotStart, busy)) slots.push(time);
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

export function isDemoSlotAvailable(
  times: string[],
  busy: { scheduledAt: Date; durationMinutes: number }[],
  scheduledAt: Date
): boolean {
  const dayOfWeek = scheduledAt.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  const time = `${pad(scheduledAt.getHours())}:${pad(scheduledAt.getMinutes())}`;
  if (!times.includes(time)) return false;
  if (scheduledAt <= new Date()) return false;
  return !isBusy(scheduledAt, busy);
}
