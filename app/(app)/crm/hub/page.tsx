import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, ArrowLeft, Plus } from "lucide-react";
import { listMyAgentConfigs } from "@/lib/team";
import { getInstanceStatus } from "@/lib/whatsapp";
import { HubClient, type HubAgent } from "./HubClient";

// Hub de agentes de IA: catálogo dos "funcionários virtuais" da empresa —
// o que cada um faz, status e ativação com um clique.
export default async function HubPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const result = await listMyAgentConfigs(user.id);
  if (!result || result.configs.length === 0) {
    return (
      <div className="min-h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <LayoutGrid size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente ainda</h1>
          <p className="text-gray-400">Crie o primeiro agente para montar sua equipe de IA.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  const { configs, isManager } = result;
  const ids = configs.map(c => c.id);
  const d7 = new Date(Date.now() - 7 * 86400000);
  const d30 = new Date(Date.now() - 30 * 86400000);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje.getTime() + 86400000);

  const [igConnections, convCounts, orderStats, apptCounts, cobrancaCounts, waStatuses] = await Promise.all([
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
    carteiraEnabled: c.carteiraEnabled,
    metricas: {
      conversas7d: convByAgent.get(c.id) ?? 0,
      vendas30d: orderByAgent.get(c.id)?.valor ?? 0,
      vendas30dCount: orderByAgent.get(c.id)?.count ?? 0,
      agendaHoje: apptByAgent.get(c.id) ?? 0,
      cobrancasAbertas: cobByAgent.get(c.id) ?? 0,
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

        <HubClient agents={agents} isManager={isManager} />
      </div>
    </div>
  );
}
