"use client";

import { usePathname } from "next/navigation";
import { ehRotaVendasIA } from "@/lib/vendas-ia";

// Telas do Vendas IA ganham a identidade das landings (classe .vi em globals.css: fundo escuro,
// destaque âmbar, fontes da landing). CRM, Super Admin e as telas antigas da Plataforma B2B
// ficam de fora e continuam no tema delas.
export function AreaConteudo({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <main className={`flex-1 overflow-y-auto ${ehRotaVendasIA(pathname) ? "vi" : ""}`}>{children}</main>;
}
