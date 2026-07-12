import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, TrendingUp, Handshake, Receipt, Clock, KanbanSquare } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { VendasChart } from "../../vendas/VendasChart";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VendasPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="vendas">
      <VendasPageContent {...props} />
    </CrmPageGate>
  );
}

async function VendasPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Wallet size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento para acompanhar as vendas aqui.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  const wonDeals = await prisma.opportunity.findMany({
    where: { wonAt: { not: null }, conversation: { agentConfigId: config.id } },
    orderBy: { wonAt: "desc" },
    include: { conversation: { select: { contactName: true, contactNumber: true } } },
  });

  const total = wonDeals.reduce((sum, d) => sum + d.dealValue, 0);
  const count = wonDeals.length;
  const ticketMedio = count > 0 ? total / count : 0;

  const openDeals = await prisma.opportunity.findMany({
    where: { wonAt: null, conversation: { agentConfigId: config.id } },
    include: { stage: true },
  });

  // Motivos de encerramento das conversas finalizadas (o texto pode ter "— observação")
  const encerradas = await prisma.conversation.findMany({
    where: { agentConfigId: config.id, status: "FINALIZADO", motivoEncerramento: { not: null } },
    select: { motivoEncerramento: true },
  });
  const motivosMap = new Map<string, number>();
  for (const c of encerradas) {
    const base = (c.motivoEncerramento ?? "").split(" — ")[0].replace(/^Outro:.*/, "Outro").trim();
    if (!base) continue;
    motivosMap.set(base, (motivosMap.get(base) ?? 0) + 1);
  }
  const motivos = Array.from(motivosMap.entries())
    .map(([motivo, quantidade]) => ({ motivo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
  const totalEncerradas = motivos.reduce((s, m) => s + m.quantidade, 0);

  const totalAberto = openDeals.reduce((sum, d) => sum + d.dealValue, 0);

  // Agrupa as negociações abertas por etapa do pipeline, na ordem da etapa; sem etapa fica por último
  const stageGroups = new Map<string, { name: string; color: string; order: number; count: number; total: number }>();
  for (const deal of openDeals) {
    const key = deal.stage?.id ?? "__sem_etapa__";
    const group = stageGroups.get(key) ?? {
      name: deal.stage?.name ?? "Sem etapa",
      color: deal.stage?.color ?? "#6b7280",
      order: deal.stage?.order ?? Number.MAX_SAFE_INTEGER,
      count: 0,
      total: 0,
    };
    group.count += 1;
    group.total += deal.dealValue;
    stageGroups.set(key, group);
  }
  const openByStage = Array.from(stageGroups.values()).sort((a, b) => a.order - b.order);

  // Receita ganha nos últimos 6 meses, mais antigo primeiro
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), mes: d.toLocaleDateString("pt-BR", { month: "short" }), total: 0 };
  });
  for (const deal of wonDeals) {
    if (!deal.wonAt) continue;
    const bucket = monthly.find(m => m.year === deal.wonAt!.getFullYear() && m.month === deal.wonAt!.getMonth());
    if (bucket) bucket.total += deal.dealValue;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-gray-400 text-sm">Atendimento</p>
          <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><Wallet size={28} className="text-blue-400" /> Vendas</h1>
          <p className="text-gray-400 mt-1">Negociações marcadas como ganhas a partir do CRM de WhatsApp.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <span className="inline-flex p-2 rounded-xl bg-green-500/10 text-green-400 mb-2"><TrendingUp size={18} /></span>
            <p className="text-3xl font-bold text-green-400">{formatBRL(total)}</p>
            <p className="text-xs text-gray-500 mt-1">Total ganho</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <span className="inline-flex p-2 rounded-xl bg-blue-500/10 text-blue-400 mb-2"><Handshake size={18} /></span>
            <p className="text-3xl font-bold text-blue-400">{count}</p>
            <p className="text-xs text-gray-500 mt-1">Negócios ganhos</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <span className="inline-flex p-2 rounded-xl bg-purple-500/10 text-purple-400 mb-2"><Receipt size={18} /></span>
            <p className="text-3xl font-bold text-purple-400">{formatBRL(ticketMedio)}</p>
            <p className="text-xs text-gray-500 mt-1">Ticket médio</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <span className="inline-flex p-2 rounded-xl bg-amber-500/10 text-amber-400 mb-2"><Clock size={18} /></span>
            <p className="text-3xl font-bold text-amber-400">{formatBRL(totalAberto)}</p>
            <p className="text-xs text-gray-500 mt-1">Total em aberto</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="font-semibold mb-3">Receita ganha por mês</p>
          <VendasChart data={monthly.map(m => ({ mes: m.mes, total: m.total }))} />
        </div>

        {/* Motivos de encerramento */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="font-semibold mb-1">Motivos de encerramento</p>
          <p className="text-xs text-gray-500 mb-4">Por que os atendimentos são finalizados — informado ao encerrar a conversa no chat.</p>
          {motivos.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum encerramento com motivo registrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {motivos.map(m => {
                const pct = totalEncerradas > 0 ? (m.quantidade / totalEncerradas) * 100 : 0;
                const positivo = m.motivo === "Venda concluída" || m.motivo === "Dúvida resolvida";
                return (
                  <div key={m.motivo} className="flex items-center gap-3">
                    <p className="w-40 md:w-48 text-xs text-gray-300 truncate text-right flex-shrink-0">{m.motivo}</p>
                    <div className="flex-1 h-6 bg-gray-950 rounded-lg overflow-hidden">
                      <div
                        className={`h-full rounded-lg flex items-center px-2 ${positivo ? "bg-green-600/50" : "bg-red-600/40"}`}
                        style={{ width: `${Math.max(8, pct)}%` }}
                      >
                        <span className="text-[10px] font-bold">{m.quantidade}</span>
                      </div>
                    </div>
                    <span className="w-10 text-[11px] text-gray-500 flex-shrink-0">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <p className="font-semibold p-5 pb-3 flex items-center gap-2"><KanbanSquare size={18} className="text-amber-400" /> Negócios abertos por etapa</p>
          {openByStage.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 pb-5">Nenhuma negociação em aberto no momento.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {openByStage.map(stage => (
                <div key={stage.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                    <p className="text-sm font-medium">{stage.name}</p>
                    <span className="text-xs text-gray-500">{stage.count} {stage.count === 1 ? "negócio" : "negócios"}</span>
                  </div>
                  <p className="text-sm font-semibold text-amber-400">{formatBRL(stage.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <p className="font-semibold p-5 pb-3">Negócios ganhos</p>
          {wonDeals.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 pb-5">Nenhuma negociação marcada como ganha ainda. Marque uma oportunidade como ganha numa conversa no CRM para ver os dados aqui.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {wonDeals.map(d => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{d.conversation.contactName || d.conversation.contactNumber}{d.title && ` — ${d.title}`}</p>
                    <p className="text-xs text-gray-500">{d.wonAt!.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                  </div>
                  <p className="text-sm font-semibold text-green-400">{formatBRL(d.dealValue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
