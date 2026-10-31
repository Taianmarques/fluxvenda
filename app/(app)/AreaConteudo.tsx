"use client";

import { usePathname } from "next/navigation";

// Telas do Vendas IA ganham a identidade das landings (classe .vi em globals.css: fundo escuro,
// destaque âmbar, fontes da landing). CRM, Super Admin e as telas antigas da Plataforma B2B
// ficam de fora e continuam no tema delas.
const ROTAS_VENDAS_IA = ["/inicio", "/scanner", "/biblioteca", "/favoritos", "/configuracoes"];

export function AreaConteudo({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const vendasIA = ROTAS_VENDAS_IA.some(r => pathname === r || pathname.startsWith(`${r}/`));
  return <main className={`flex-1 overflow-y-auto ${vendasIA ? "vi" : ""}`}>{children}</main>;
}
