"use client";

import { useCrmTheme, type CrmTheme } from "../CrmThemeContext";

// Repasse fino pro tema global do CRM (app/(app)/crm/CrmThemeContext.tsx) — os componentes
// de gráfico (Recharts, client) continuam chamando useDashboardTheme() sem saber que a
// preferência agora é unificada pro CRM inteiro, escolhida em Configurações > Aparência.
export type DashboardTheme = CrmTheme;

export function useDashboardTheme(): DashboardTheme {
  return useCrmTheme().theme;
}
