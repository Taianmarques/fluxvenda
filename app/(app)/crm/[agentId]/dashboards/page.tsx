import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { DashboardTabs, type DashboardView } from "../../dashboards/DashboardTabs";
import { VisaoGeralTab } from "../../dashboards/VisaoGeralTab";
import { AgendamentosTab } from "../../dashboards/AgendamentosTab";
import { VendasTab } from "../../dashboards/VendasTab";
import { MeuDesempenhoTab } from "../../dashboards/MeuDesempenhoTab";

const VIEWS: DashboardView[] = ["visaogeral", "agendamentos", "vendas", "meudesempenho"];

const DESCRIPTIONS: Record<DashboardView, string> = {
  visaogeral: "Resumo de atendimento, equipe, leads e vendas dos últimos 30 dias.",
  agendamentos: "Volume, status e desempenho dos agendamentos feitos pelo agente.",
  vendas: "Desempenho comercial no período, comparado ao período anterior de mesma duração.",
  meudesempenho: "Seus negócios e carteira de clientes — meta e negócios do mês atual.",
};

export default function DashboardsPage(props: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ view?: string; from?: string; to?: string }>;
}) {
  return (
    <CrmPageGate pageKey="dashboards">
      <DashboardsPageContent {...props} />
    </CrmPageGate>
  );
}

async function DashboardsPageContent({ params, searchParams }: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ view?: string; from?: string; to?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const sp = await searchParams;
  const view: DashboardView = VIEWS.includes(sp.view as DashboardView) ? (sp.view as DashboardView) : "visaogeral";

  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <LayoutDashboard size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento para ver os dashboards aqui.</p>
          <Link href={`/crm/${agentId}/configurar`} className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Configurar agente
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-gray-400 text-sm">CRM</p>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><LayoutDashboard size={28} className="text-blue-400" /> Dashboards</h1>
            <p className="text-gray-400 mt-1">{DESCRIPTIONS[view]}</p>
          </div>
          <DashboardTabs agentId={agentId} activeView={view} />
        </div>

        {view === "visaogeral" && <VisaoGeralTab agentId={agentId} config={config} />}
        {view === "agendamentos" && <AgendamentosTab agentId={agentId} config={config} />}
        {view === "vendas" && <VendasTab agentId={agentId} config={config} searchParams={sp} />}
        {view === "meudesempenho" && <MeuDesempenhoTab agentId={agentId} config={config} userId={user.id} />}
      </div>
    </div>
  );
}
