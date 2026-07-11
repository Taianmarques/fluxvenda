import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import { currentUser } from "@clerk/nextjs/server";
import { getCrmTrialStatus } from "@/lib/products";

// Contagem regressiva (ou aviso de expirado) do teste grátis de 7 dias do CRM — mostrado
// no topo do Hub/Ferramentas pra ninguém ser surpreendido pelo bloqueio quando o trial acaba.
export async function TrialBanner() {
  const user = await currentUser();
  if (!user) return null;

  const status = await getCrmTrialStatus(user.id);
  if (!status) return null;

  if (status.expired) {
    return (
      <div className="flex items-center gap-3 bg-red-950/30 border-b border-red-800/50 px-4 py-2.5 text-sm">
        <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
        <p className="text-red-300 flex-1">Seu teste grátis do CRM expirou.</p>
        <Link href="/produtos/crm" className="text-red-300 hover:text-red-200 font-semibold underline flex-shrink-0">
          Contratar agora
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-amber-950/30 border-b border-amber-800/50 px-4 py-2.5 text-sm">
      <Clock size={16} className="text-amber-400 flex-shrink-0" />
      <p className="text-amber-200 flex-1">
        Teste grátis do CRM — {status.daysLeft === 0 ? "expira hoje" : `${status.daysLeft} dia${status.daysLeft === 1 ? "" : "s"} restante${status.daysLeft === 1 ? "" : "s"}`}.
      </p>
      <Link href="/produtos/crm" className="text-amber-200 hover:text-amber-100 font-semibold underline flex-shrink-0">
        Contratar agora
      </Link>
    </div>
  );
}
