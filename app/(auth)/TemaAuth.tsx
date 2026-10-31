import { fontesVendasIA } from "@/app/fontes";

// Telas de login/senha com o visual do Vendas IA (tema .vi de globals.css) quando vendasIA;
// senão, sem mudança (FluxVenda)
export function TemaAuth({ vendasIA, children }: { vendasIA: boolean; children: React.ReactNode }) {
  return vendasIA ? <div className={`${fontesVendasIA} vi min-h-screen`}>{children}</div> : <>{children}</>;
}
