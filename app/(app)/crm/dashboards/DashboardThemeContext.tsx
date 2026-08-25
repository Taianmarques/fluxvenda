"use client";

import { createContext, useContext } from "react";

// As abas de dashboard (VendasTab, VisaoGeralTab...) são Server Components com Prisma
// direto — não dá pra passar o tema como prop (calculado no cliente, via localStorage).
// Os gráficos Recharts (client) leem o tema por Context em vez disso; o resto do corpo das
// abas usa classes Tailwind de cinza puras, reskinadas via CSS var em DashboardsShell.
export type DashboardTheme = "dark" | "light";

const DashboardThemeContext = createContext<DashboardTheme>("dark");

export const DashboardThemeProvider = DashboardThemeContext.Provider;

export function useDashboardTheme(): DashboardTheme {
  return useContext(DashboardThemeContext);
}
