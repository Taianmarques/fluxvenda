import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, ArrowLeft, Plus } from "lucide-react";
import { listMyAgentConfigs } from "@/lib/team";
import { getInstanceStatus } from "@/lib/whatsapp";
import { buildCrmChecklist } from "@/lib/crm-onboarding";
import { HubClient, type HubAgent } from "./HubClient";
import { GettingStartedChecklist } from "./GettingStartedChecklist";

// Hub de agentes de IA: catálogo dos "funcionários virtuais" da empresa —
// o que cada um faz, status e ativação com um clique.
export default async function HubPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const [result, profile] = await Promise.all([
    listMyAgentConfigs(user.id),
    prisma.profile.findUnique({ where: { id: user.id }, select: { name: true } }),
  ]);
  if (!result) redirect("/crm");

  const { configs, isManager, teamId } = result;
  const firstName = (profile?.name ?? "").split(" ")[0] || "tudo bem";

  const [team, teamMemberCount, instagramConnections, pipelines] = await Promise.all([
    prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { crmTrialEndsAt: true, productsOwned: true } }),
    prisma.teamMember.count({ where: { teamId } }),
    prisma.instagramConnection.findMany({
      where: { agentConfigId: { in: configs.map(c => c.id) } },
      select: { agentConfigId: true, instagramUsername: true },
    }),
    prisma.pipeline.findMany({
      where: { agentConfigId: { in: configs.map(c => c.id) } },
      select: {
        agentConfigId: true, name: true, agenteInstrucoes: true,
        stages: { select: { name: true, color: true, agenteInstrucoes: true, followupDelaysMinutes: true }, orderBy: { order: "asc" } },
      },
    }),
  ]);

  const checklist = isManager ? buildCrmChecklist({
    configs,
    instagramAgentIds: new Set(instagramConnections.map(c => c.agentConfigId)),
    pipelines,
    teamMemberCount,
    team,
  }) : null;

  if (configs.length === 0) {
    return (
      <div className="min-h-full bg-gray-950 text-white p-4 md:p-6 overflow-y-auto h-full">
        <div className="max-w-3xl mx-auto space-y-5 py-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <LayoutGrid size={26} className="text-blue-400" /> Hub de agentes de IA
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isManager
                ? "Comece conectando um canal — o resto você organiza no seu ritmo."
                : "Peça ao gestor da equipe para conectar o primeiro canal."}
            </p>
          </div>
          {checklist && <GettingStartedChecklist steps={checklist} name={firstName} />}
        </div>
      </div>
    );
  }
  const ids = configs.map(c => c.id);
  const d7 = new Date(Date.now() - 7 * 86400000);
  const d30 = new Date(Date.now() - 30 * 86400000);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje.getTime() + 86400000);

  const [convCounts, orderStats, apptCounts, cobrancaCounts, feedbackStats, waStatuses] = await Promise.all([
    prisma.conversation.groupBy({
      by: ["agentConfigId"],
      where: { agentConfigId: { in: ids }, updatedAt: { gte: d7 } },
      _count: { id: true },
    }),
    prisma.order.groupBy({
      by: ["agentConfigId"],
      where: { agentConfigId: { in: ids }, status: "PAGO", paidAt: { gte: d30 } },
      _count: { id: true },
      _sum: { total: true, deliveryFee: true },
    }),
    prisma.appointment.groupBy({
      by: ["agentConfigId"],
      where: { agentConfigId: { in: ids }, status: "CONFIRMADO", scheduledAt: { gte: hoje, lt: amanha } },
      _count: { id: true },
    }),
    prisma.cobranca.groupBy({
      by: ["agentConfigId"],
      where: { agentConfigId: { in: ids }, status: { in: ["PENDENTE", "BOLETO_GERADO", "VENCIDA"] } },
      _count: { id: true },
    }),
    prisma.posVendaFeedback.groupBy({
      by: ["agentConfigId"],
      where: { agentConfigId: { in: ids }, createdAt: { gte: d30 } },
      _count: { id: true },
      _avg: { rating: true },
    }),
    Promise.all(configs.map(c => c.uazapiToken
      ? getInstanceStatus(c.uazapiToken).catch(() => ({ connected: false }))
      : Promise.resolve({ connected: false })
    )),
  ]);

  const igByAgent = new Map(instagramConnections.map(i => [i.agentConfigId, i.instagramUsername ?? ""]));
  const convByAgent = new Map(convCounts.map(c => [c.agentConfigId, c._count.id]));
  const orderByAgent = new Map(orderStats.map(o => [o.agentConfigId, { count: o._count.id, valor: (o._sum.total ?? 0) + (o._sum.deliveryFee ?? 0) }]));
  const apptByAgent = new Map(apptCounts.map(a => [a.agentConfigId, a._count.id]));
  const cobByAgent = new Map(cobrancaCounts.map(c => [c.agentConfigId, c._count.id]));
  const fbByAgent = new Map(feedbackStats.map(f => [f.agentConfigId, { avg: f._avg.rating, count: f._count.id }]));

  const agents: HubAgent[] = configs.map((c, i) => ({
    id: c.id,
    nome: c.nome,
    segmento: c.segmento,
    active: c.active,
    configured: Boolean(c.systemPrompt),
    waConnected: waStatuses[i].connected,
    igUsername: igByAgent.has(c.id) ? igByAgent.get(c.id)! : null,
    schedulingEnabled: c.schedulingEnabled,
    commerceEnabled: c.commerceEnabled,
    cobrancaEnabled: c.cobrancaEnabled,
    prospeccaoEnabled: c.prospeccaoEnabled,
    posVendaEnabled: c.posVendaEnabled,
    recompraEnabled: c.recompraEnabled,
    metricas: {
      conversas7d: convByAgent.get(c.id) ?? 0,
      vendas30d: orderByAgent.get(c.id)?.valor ?? 0,
      vendas30dCount: orderByAgent.get(c.id)?.count ?? 0,
      agendaHoje: apptByAgent.get(c.id) ?? 0,
      cobrancasAbertas: cobByAgent.get(c.id) ?? 0,
      avaliacaoMedia: fbByAgent.get(c.id)?.avg ?? null,
      avaliacoes30d: fbByAgent.get(c.id)?.count ?? 0,
    },
  }));

  return (
    <div className="min-h-full bg-gray-950 text-white p-4 md:p-6 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 w-fit">
              <ArrowLeft size={12} /> Plataforma
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <LayoutGrid size={26} className="text-blue-400" /> Hub de agentes de IA
            </h1>
            <p className="text-sm text-gray-500 mt-1">Sua equipe virtual: ligue e desligue cada agente conforme a operação precisa.</p>
          </div>
          {isManager && (
            <Link
              href={`/crm/${configs[0].id}/canais`}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              <Plus size={15} /> Novo número
            </Link>
          )}
        </div>

        {checklist && <GettingStartedChecklist steps={checklist} name={firstName} />}

        <HubClient agents={agents} isManager={isManager} />
      </div>
    </div>
  );
}
