import { fontesVendasIA } from "@/app/fontes";

// Identidade Vendas IA (mesma das landings) — tema .vi em globals.css
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${fontesVendasIA} vi min-h-dvh`}>{children}</div>;
}
