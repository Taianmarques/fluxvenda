import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { type DashboardView } from "../../dashboards/DashboardTabs";
import { VisaoGeralTab } from "../../dashboards/VisaoGeralTab";
import { MultiatendimentoTab } from "../../dashboards/MultiatendimentoTab";
import { AgendamentosTab } from "../../dashboards/AgendamentosTab";
import { VendasTab } from "../../dashboards/VendasTab";
import { MeuDesempenhoTab } from "../../dashboards/MeuDesempenhoTab";
import { FunilTab } from "../../dashboards/FunilTab";
import { DashboardsShell } from "../../dashboards/DashboardsShell";
import { DAY_MS } from "../../dashboards/dashboard-utils";

const VIEWS: DashboardView[] = ["vendas", "visaogeral", "multiatendimento", "agendamentos", "meudesempenho", "funil"];

const DESCRIPTIONS: Record<DashboardView, string> = {
  vendas: "Desempenho comercial no período, comparado ao período anterior de mesma duração.",
  visaogeral: "Resumo de atendimento, equipe, leads e vendas dos últimos 30 dias.",
  multiatendimento: "Volume de atendimentos, tempo de resposta e comparação entre IA e humano no período.",
  agendamentos: "Volume, status e desempenho dos agendamentos feitos pelo agente.",
  meudesempenho: "Seus negócios e carteira de clientes — meta e negócios do mês atual.",
  funil: "Ampulheta: aquisição em cima, venda no meio, retenção e expansão embaixo.",
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
  const view: DashboardView = VIEWS.includes(sp.view as DashboardView) ? (sp.view as DashboardView) : "vendas";

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

  const now = new Date();
  const to = sp.to ? new Date(`${sp.to}T23:59:59.999`) : now;
  const from = sp.from ? new Date(`${sp.from}T00:00:00`) : new Date(to.getTime() - 29 * DAY_MS);

  return (
    <DashboardsShell agentId={agentId} view={view} description={DESCRIPTIONS[view]} from={from.toISOString()} to={to.toISOString()}>
      {view === "vendas" && <VendasTab agentId={agentId} config={config} from={from} to={to} />}
      {view === "visaogeral" && <VisaoGeralTab agentId={agentId} config={config} />}
      {view === "multiatendimento" && <MultiatendimentoTab agentId={agentId} config={config} from={from} to={to} />}
      {view === "agendamentos" && <AgendamentosTab agentId={agentId} config={config} />}
      {view === "meudesempenho" && <MeuDesempenhoTab agentId={agentId} config={config} userId={user.id} />}
      {view === "funil" && <FunilTab agentId={agentId} config={config} />}
    </DashboardsShell>
  );
}
