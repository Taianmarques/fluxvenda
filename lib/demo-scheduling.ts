import type { AvailabilityRule } from "@/lib/scheduling";

// Agenda fixa da demonstração do CRM: seg-sex 09:00-18:00, sem conceito de profissional
// (é sempre alguém do time FluxVenda) — ajustar aqui se o horário comercial mudar.
export const DEMO_AVAILABILITY: AvailabilityRule[] = [1, 2, 3, 4, 5].map(dayOfWeek => ({
  dayOfWeek,
  start: "09:00",
  end: "18:00",
}));

export const DEMO_SLOT_MINUTES = 40;

// Janela de dias buscada de uma vez pro calendário mensal ter margem de navegar sem re-fetch.
export const DEMO_SLOTS_WINDOW_DAYS = 60;
