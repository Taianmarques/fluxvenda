import { LayoutDashboard } from "lucide-react";
import { DashboardTabs, type DashboardView } from "./DashboardTabs";
import { DateRangePicker } from "./DateRangePicker";

// O tema (claro/escuro) e o reskin via CSS var agora vêm de fora — do layout raiz do CRM
// (app/(app)/crm/[agentId]/layout.tsx via CrmThemeScope) — Dashboards deixou de ter sua
// própria chave de localStorage/botão de troca. Server Component de novo, já que não
// precisa mais de estado de tema aqui.
export function DashboardsShell({ agentId, view, description, from, to, children }: {
  agentId: string;
  view: DashboardView;
  description: string;
  from: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <p className="text-sm text-gray-400">CRM</p>
          <h1 className="text-3xl font-bold mt-1 flex items-center gap-2">
            <LayoutDashboard size={28} className="text-blue-400" /> Dashboards
          </h1>
          <p className="mt-1 text-gray-400">{description}</p>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <DashboardTabs agentId={agentId} activeView={view} />
          {(view === "vendas" || view === "multiatendimento") && <DateRangePicker from={from} to={to} />}
        </div>

        {children}
      </div>
    </div>
  );
}
