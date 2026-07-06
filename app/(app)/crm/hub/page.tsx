import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid, ArrowLeft, MessageCircle, Instagram, Calendar, ShoppingCart,
  Landmark, Briefcase, Target, Settings, Wifi, Bot, Plus,
} from "lucide-react";
import { listMyAgentConfigs } from "@/lib/team";
import { getInstanceStatus } from "@/lib/whatsapp";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
          <p className="text-gray-400">Crie o primeiro agente para começar a atender.</p>
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

  const [igConnections, convCounts, orderStats, apptCounts, waStatuses] = await Promise.all([
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
    Promise.all(configs.map(c => c.uazapiToken
      ? getInstanceStatus(c.uazapiToken).catch(() => ({ connected: false }))
      : Promise.resolve({ connected: false })
    )),
  ]);

  const igByAgent = new Map(igConnections.map(i => [i.agentConfigId, i.instagramUsername]));
  const convByAgent = new Map(convCounts.map(c => [c.agentConfigId, c._count.id]));
  const orderByAgent = new Map(orderStats.map(o => [o.agentConfigId, { count: o._count.id, valor: (o._sum.total ?? 0) + (o._sum.deliveryFee ?? 0) }]));
  const apptByAgent = new Map(apptCounts.map(a => [a.agentConfigId, a._count.id]));

  return (
    <div className="min-h-full bg-gray-950 text-white p-4 md:p-6 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 w-fit">
              <ArrowLeft size={12} /> Plataforma
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <LayoutGrid size={26} className="text-blue-400" /> Hub de agentes
            </h1>
            <p className="text-sm text-gray-500 mt-1">{configs.length} agente{configs.length === 1 ? "" : "s"} na equipe</p>
          </div>
          {isManager && (
            <Link
              href={`/crm/${configs[0].id}/canais`}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              <Plus size={15} /> Novo agente
            </Link>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {configs.map((config, i) => {
            const wa = waStatuses[i];
            const igUsername = igByAgent.get(config.id);
            const vendas = orderByAgent.get(config.id);
            const modulos = [
              { on: config.schedulingEnabled, label: "Agenda", icon: Calendar },
              { on: config.commerceEnabled, label: "Comércio", icon: ShoppingCart },
              { on: config.cobrancaEnabled, label: "Cobrança", icon: Landmark },
              { on: config.carteiraEnabled, label: "Carteira", icon: Briefcase },
              { on: config.prospeccaoEnabled, label: "Prospecção", icon: Target },
            ].filter(m => m.on);

            return (
              <div key={config.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                {/* Cabeçalho do agente */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold flex items-center gap-2">
                      <Bot size={16} className={config.active ? "text-green-400" : "text-gray-600"} />
                      {config.nome}
                    </p>
                    {(config.segmento || config.subsegmento) && (
                      <p className="text-xs text-gray-500 mt-0.5">{[config.segmento, config.subsegmento].filter(Boolean).join(" › ")}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0 ${
                    config.active ? "bg-green-900/40 text-green-300 border-green-800/50" : "bg-gray-800 text-gray-400 border-gray-700"
                  }`}>
                    {config.active ? "Ativo" : "Pausado"}
                  </span>
                </div>

                {/* Canais */}
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                    wa.connected ? "bg-green-900/30 text-green-300 border-green-800/50" : "bg-gray-800/60 text-gray-500 border-gray-700"
                  }`}>
                    <MessageCircle size={11} /> WhatsApp {wa.connected ? "conectado" : "desconectado"}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                    igUsername !== undefined ? "bg-purple-900/30 text-purple-300 border-purple-800/50" : "bg-gray-800/60 text-gray-500 border-gray-700"
                  }`}>
                    <Instagram size={11} /> {igUsername !== undefined ? `@${igUsername || "conectado"}` : "Instagram não conectado"}
                  </span>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-950 border border-gray-800 rounded-xl py-2">
                    <p className="text-lg font-bold text-blue-400">{convByAgent.get(config.id) ?? 0}</p>
                    <p className="text-[10px] text-gray-500">conversas 7d</p>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-xl py-2">
                    <p className="text-lg font-bold text-green-400 truncate px-1">{vendas ? brl(vendas.valor) : "—"}</p>
                    <p className="text-[10px] text-gray-500">vendas 30d{vendas ? ` (${vendas.count})` : ""}</p>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-xl py-2">
                    <p className="text-lg font-bold text-amber-400">{apptByAgent.get(config.id) ?? 0}</p>
                    <p className="text-[10px] text-gray-500">agenda hoje</p>
                  </div>
                </div>

                {/* Módulos ativos */}
                {modulos.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {modulos.map(m => (
                      <span key={m.label} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/50 text-blue-300 border border-blue-900/50 flex items-center gap-1">
                        <m.icon size={10} /> {m.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 flex-wrap pt-1 border-t border-gray-800/60">
                  <Link href={`/crm/${config.id}`} className="flex-1 min-w-[100px] text-center text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600/50 rounded-lg px-3 py-2 transition-colors">
                    Mensagens
                  </Link>
                  <Link href={`/crm/${config.id}/canais`} className="flex-1 min-w-[100px] text-center text-xs font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-2 transition-colors flex items-center justify-center gap-1">
                    <Wifi size={11} /> Canais
                  </Link>
                  {isManager && (
                    <Link href={`/ferramentas/whatsapp/${config.id}`} className="flex-1 min-w-[100px] text-center text-xs font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-2 transition-colors flex items-center justify-center gap-1">
                      <Settings size={11} /> Configurar
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
