import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { listMyAgentConfigs } from "@/lib/team";
import { getInstanceStatus } from "@/lib/whatsapp";
import { HubClient, type HubAgent } from "./HubClient";

// Hub de agentes de IA: catálogo dos "funcionários virtuais" da empresa —
// o que cada um faz, status e ativação com um clique. A página de boas-vindas
// (checklist de primeiros passos) é separada — ver app/(app)/crm/hub/inicio.
export default async function HubPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const result = await listMyAgentConfigs(user.id);
  if (!result) redirect("/crm");

  const { configs, isManager } = result;

  if (configs.length === 0) {
    if (isManager) redirect("/crm/hub/inicio");
    return (
      <div className="min-h-full bg-gray-950 p-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-3">
          <LayoutGrid size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente ainda</h1>
          <p className="text-gray-400">Peça ao gestor da equipe para criar o primeiro agente de IA.</p>
        </div>
      </div>
    );
  }

  const ids = configs.map(c => c.id);
  const d7 = new Date(Date.now() - 7 * 86400000);
  const d30 = new Date(Date.now() - 30 * 86400000);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje.getTime() + 86400000);

  const [igConnections, convCounts, orderStats, apptCounts, cobrancaCounts, feedbackStats, waStatuses] = await Promise.all([
    prisma.instagramConnection.findMany({
      where: { agentConfigId: { in: ids } },
      select: { agentConfigId: true, instagramUsername: true },
    }),
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

  const igByAgent = new Map(igConnections.map(i => [i.agentConfigId, i.instagramUsername ?? ""]));
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

  return <HubClient agents={agents} isManager={isManager} />;
}
