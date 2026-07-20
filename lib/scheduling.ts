export type AvailabilityRule = { dayOfWeek: number; start: string; end: string }; // start/end "HH:mm"

// Reserva aguardando pagamento do sinal segura o horário por esse tempo; depois expira
// (lazy — ver updateMany nas rotas públicas) e o slot volta pra grade.
export const PENDING_HOLD_MS = 30 * 60_000;

// Fragmento de where pra listar agendamentos que OCUPAM um horário: confirmados +
// reservas aguardando pagamento ainda dentro da janela de 30 min.
export function busyStatusWhere() {
  return {
    OR: [
      { status: "CONFIRMADO" as const },
      { status: "AGUARDANDO_PAGAMENTO" as const, createdAt: { gte: new Date(Date.now() - PENDING_HOLD_MS) } },
    ],
  };
}

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toHHMM(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

// Horário efetivo de um profissional: sem horário próprio configurado → herda o funcionamento
// da empresa; com horário próprio → interseção por dia com o funcionamento (o horário do
// profissional nunca extrapola o funcionamento, e dia fechado da empresa fica sem slots).
export function resolveAvailability(
  businessHours: AvailabilityRule[],
  professionalHours?: AvailabilityRule[] | null
): AvailabilityRule[] {
  if (!professionalHours || professionalHours.length === 0) return businessHours;
  if (!businessHours || businessHours.length === 0) return professionalHours;
  const out: AvailabilityRule[] = [];
  for (const p of professionalHours) {
    for (const b of businessHours) {
      if (b.dayOfWeek !== p.dayOfWeek) continue;
      const start = Math.max(parseTime(p.start), parseTime(b.start));
      const end = Math.min(parseTime(p.end), parseTime(b.end));
      if (start < end) out.push({ dayOfWeek: p.dayOfWeek, start: toHHMM(start), end: toHHMM(end) });
    }
  }
  return out;
}

// Gera os horários livres dos próximos `days` dias, respeitando as regras de disponibilidade
// e excluindo horários já ocupados por outros agendamentos confirmados.
// `untilClose`: aceita horários que começam dentro do funcionamento mesmo que o atendimento
// termine depois do fechamento (opcional, por agente — AgentConfig.agendarAteEncerramento).
// `capacity`: atendimentos simultâneos no mesmo horário (AgentConfig.vagasSimultaneas, só
// quando não há profissional envolvido — com profissional a capacidade é sempre 1).
export function getAvailableSlots(
  availability: AvailabilityRule[],
  slotDurationMinutes: number,
  busy: { scheduledAt: Date; durationMinutes: number }[],
  fromDate: Date = new Date(),
  days = 14,
  untilClose = false,
  capacity = 1
): { date: string; weekday: string; slots: string[] }[] {
  const result: { date: string; weekday: string; slots: string[] }[] = [];
  const now = new Date();

  // Serviços longos avançam de hora em hora (em vez de pular a duração inteira) pra grade
  // não ficar "quebrada" — ex: serviço de 2h oferece 09:00, 10:00, 11:00... e não só 09/11/13.
  const step = Math.min(slotDurationMinutes, 60);

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
      for (let t = startMin; untilClose ? t < endMin : t + slotDurationMinutes <= endMin; t += step) {
        const slotStart = new Date(day);
        slotStart.setMinutes(t);
        if (slotStart <= now) continue; // não oferece horário no passado

        const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60000);
        const overlapping = busy.filter(b => {
          const bStart = b.scheduledAt;
          const bEnd = new Date(bStart.getTime() + b.durationMinutes * 60000);
          return slotStart < bEnd && slotEnd > bStart;
        }).length;
        if (overlapping < Math.max(1, capacity)) slots.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
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
  scheduledAt: Date,
  untilClose = false,
  capacity = 1
): boolean {
  const dayOfWeek = scheduledAt.getDay();
  const minutesOfDay = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();

  const withinRule = availability.some(r => {
    if (r.dayOfWeek !== dayOfWeek) return false;
    if (minutesOfDay < parseTime(r.start)) return false;
    return untilClose ? minutesOfDay < parseTime(r.end) : minutesOfDay + slotDurationMinutes <= parseTime(r.end);
  });
  if (!withinRule) return false;
  if (scheduledAt <= new Date()) return false;

  const slotEnd = new Date(scheduledAt.getTime() + slotDurationMinutes * 60000);
  const overlapping = busy.filter(b => {
    const bStart = b.scheduledAt;
    const bEnd = new Date(bStart.getTime() + b.durationMinutes * 60000);
    return scheduledAt < bEnd && slotEnd > bStart;
  }).length;
  return overlapping < Math.max(1, capacity);
}

// Resumo compacto para o modelo: poucos dias, poucos horários por dia. O objetivo é dar
// contexto suficiente pra IA conversar naturalmente, sem ela despejar a lista inteira no cliente.
export function formatSlotsForAgent(slots: { date: string; weekday: string; slots: string[] }[]): string {
  if (slots.length === 0) return "Não há horários disponíveis no período consultado.";
  return slots
    .slice(0, 5)
    .map(s => {
      const all = s.slots;
      // Distribui os horários ao longo do dia em vez de mostrar só os primeiros
      // (que seriam todos da manhã) — garante que manhã, tarde e noite apareçam para a IA.
      let preview: string[];
      if (all.length <= 6) {
        preview = all;
      } else {
        const step = Math.floor((all.length - 1) / 4);
        preview = [
          all[0],
          all[step],
          all[step * 2],
          all[step * 3],
          all[all.length - 1],
        ].filter((v, i, a) => a.indexOf(v) === i);
      }
      const extra = all.length > preview.length
        ? ` (outros horários disponíveis entre ${all[0]} e ${all[all.length - 1]})`
        : "";
      return `${s.date} (${s.weekday}): ${preview.join(", ")}${extra}`;
    })
    .join("\n");
}
