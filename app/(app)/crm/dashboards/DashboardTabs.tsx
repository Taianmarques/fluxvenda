"use client";

import { useRouter } from "next/navigation";
import { LayoutDashboard, CalendarCheck, BarChart3, Filter, Headset, type LucideIcon } from "lucide-react";

export type DashboardView = "vendas" | "visaogeral" | "multiatendimento" | "agendamentos" | "funil";

const TABS: { key: DashboardView; label: string; icon: LucideIcon }[] = [
  { key: "vendas", label: "Vendas", icon: BarChart3 },
  { key: "visaogeral", label: "Visão Geral", icon: LayoutDashboard },
  { key: "multiatendimento", label: "Multiatendimento", icon: Headset },
  { key: "agendamentos", label: "Agendamentos", icon: CalendarCheck },
  { key: "funil", label: "Funil", icon: Filter },
];

// Alterna o "tipo" de dashboard exibido dentro da mesma página, via ?view= — troca a
// navegação por 4 páginas separadas no menu por um filtro no topo da própria página.
export function DashboardTabs({ agentId, activeView }: { agentId: string; activeView: DashboardView }) {
  const router = useRouter();

  return (
    <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 flex-wrap">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => router.push(`/crm/${agentId}/dashboards?view=${tab.key}`)}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
            activeView === tab.key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <tab.icon size={14} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
