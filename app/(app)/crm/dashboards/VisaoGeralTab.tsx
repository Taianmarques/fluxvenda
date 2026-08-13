import Link from "next/link";
import { Wallet, Trophy, UserPlus, MessageCircle, Headset, Bot, UserCheck, Users2, ListTodo, Filter, KanbanSquare, Goal } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { AgentConfig } from "@/app/generated/prisma/client";
import { WeeklyBarChart } from "./DashboardCharts";
import { formatBRL, DAY_MS } from "./dashboard-utils";

export async function VisaoGeralTab({ agentId, config }: { agentId: string; config: AgentConfig }) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

  const [conversations, leadStatuses, opportunities, pendingTasks, team] = await Promise.all([
    prisma.conversation.findMany({
      where: { agentConfigId: config.id, isSandbox: false, isGroup: false },
      select: { id: true, createdAt: true, status: true, humanTakeover: true, followupCount: true, leadStatusId: true, assignedToId: true },
    }),
    prisma.leadStatus.findMany({ where: { agentConfigId: config.id }, orderBy: { order: "asc" } }),
    prisma.opportunity.findMany({
      where: { conversation: { agentConfigId: config.id, isSandbox: false, isGroup: false } },
      select: {
        id: true, dealValue: true, wonAt: true, lostAt: true, stageFollowupCount: true, createdAt: true,
        conversation: { select: { assignedToId: true } },
      },
    }),
    prisma.opportunityTask.findMany({
      where: { done: false, opportunity: { conversation: { agentConfigId: config.id } } },
      select: { assignedToId: true },
    }),
    prisma.team.findUnique({
      where: { id: config.teamId },
      include: {
        manager: { select: { id: true, name: true } },
        members: { include: { profile: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  const nameById = new Map<string, string>();
  if (team) {
    nameById.set(team.manager.id, team.manager.name);
    for (const m of team.members) nameById.set(m.profile.id, m.profile.name);
  }

  // KPIs gerais
  const activeConversations = conversations.filter(c => c.status !== "FINALIZADO");
  const newLeads30d = conversations.filter(c => c.createdAt >= thirtyDaysAgo).length;
  const openValue = opportunities.filter(o => !o.wonAt && !o.lostAt).reduce((s, o) => s + o.dealValue, 0);
  const won30d = opportunities.filter(o => o.wonAt && o.wonAt >= thirtyDaysAgo);
  const lost30d = opportunities.filter(o => o.lostAt && o.lostAt >= thirtyDaysAgo);
  const winRate30d = won30d.length + lost30d.length > 0 ? won30d.length / (won30d.length + lost30d.length) : null;

  // Atendimento: IA vs humano (entre as conversas ativas) + follow-ups já disparados
  const humanCount = activeConversations.filter(c => c.humanTakeover).length;
  const iaCount = activeConversations.length - humanCount;
  const convFollowupCount = conversations.filter(c => c.followupCount > 0).length;
  const stageFollowupCount = opportunities.filter(o => o.stageFollowupCount > 0).length;

  // Equipe: ranking por valor ganho + tarefas pendentes por vendedor
  const wonAll = opportunities.filter(o => o.wonAt);
  const rankingMap = new Map<string, { count: number; total: number }>();
  for (const o of wonAll) {
    const id = o.conversation.assignedToId ?? "__sem__";
    const entry = rankingMap.get(id) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += o.dealValue;
    rankingMap.set(id, entry);
  }
  const ranking = Array.from(rankingMap.entries())
    .map(([id, v]) => ({ id, name: id === "__sem__" ? "Sem atendente" : (nameById.get(id) ?? "Ex-membro"), ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const rankingMaxTotal = Math.max(1, ...ranking.map(r => r.total));

  // Meta do mês: valor ganho no mês corrente, geral e por vendedor, comparado à meta configurada
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const wonThisMonth = opportunities.filter(o => o.wonAt && o.wonAt >= startOfMonth);
  const wonThisMonthTotal = wonThisMonth.reduce((s, o) => s + o.dealValue, 0);
  const metaGeralPct = config.metaGeralMensal > 0 ? Math.min(100, (wonThisMonthTotal / config.metaGeralMensal) * 100) : null;

  const metasPorVendedor = config.metasPorVendedor as Record<string, number>;
  const wonThisMonthByAttendant = new Map<string, number>();
  for (const o of wonThisMonth) {
    const id = o.conversation.assignedToId ?? "__sem__";
    wonThisMonthByAttendant.set(id, (wonThisMonthByAttendant.get(id) ?? 0) + o.dealValue);
  }
  const metasComVendedor = Object.entries(metasPorVendedor ?? {})
    .filter(([, valor]) => valor > 0)
    .map(([id, valor]) => ({
      id,
      name: nameById.get(id) ?? "Ex-membro",
      meta: valor,
      atingido: wonThisMonthByAttendant.get(id) ?? 0,
      pct: Math.min(100, ((wonThisMonthByAttendant.get(id) ?? 0) / valor) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);

  const taskCountMap = new Map<string, number>();
  for (const t of pendingTasks) {
    const id = t.assignedToId ?? "__sem__";
    taskCountMap.set(id, (taskCountMap.get(id) ?? 0) + 1);
  }
  const pendingByAttendant = Array.from(taskCountMap.entries())
    .map(([id, count]) => ({ id, name: id === "__sem__" ? "Sem responsável" : (nameById.get(id) ?? "Ex-membro"), count }))
    .sort((a, b) => b.count - a.count);

  // Leads/funil: novos leads por semana (últimas 8) + leads por status
  const weekBuckets = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(now.getTime() - (7 - i - 1) * 7 * DAY_MS);
    const start = new Date(end.getTime() - 7 * DAY_MS);
    return { start, end, total: 0, semana: start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) };
  });
  for (const c of conversations) {
    const bucket = weekBuckets.find(w => c.createdAt >= w.start && c.createdAt < w.end);
    if (bucket) bucket.total += 1;
  }

  const statusCountMap = new Map<string, number>();
  for (const c of conversations) {
    const key = c.leadStatusId ?? "__sem__";
    statusCountMap.set(key, (statusCountMap.get(key) ?? 0) + 1);
  }
  const leadsByStatus = [
    ...leadStatuses.map(s => ({ id: s.id, name: s.name, color: s.color, count: statusCountMap.get(s.id) ?? 0 })),
    ...(statusCountMap.get("__sem__") ? [{ id: "__sem__", name: "Sem status", color: "#6b7280", count: statusCountMap.get("__sem__")! }] : []),
  ].filter(s => s.count > 0).sort((a, b) => b.count - a.count);
  const leadsByStatusMax = Math.max(1, ...leadsByStatus.map(s => s.count));

  // Pipeline/vendas: ganhos x perdidos no período + ticket médio geral
  const won30dTotal = won30d.reduce((s, o) => s + o.dealValue, 0);
  const lost30dTotal = lost30d.reduce((s, o) => s + o.dealValue, 0);
  const ticketMedio = wonAll.length > 0 ? wonAll.reduce((s, o) => s + o.dealValue, 0) / wonAll.length : 0;
  const ganhoPerdaMax = Math.max(1, won30d.length, lost30d.length);

  return (
    <>
      {/* KPIs gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
          <span className="inline-flex p-2 rounded-xl bg-blue-500/10 text-blue-400 mb-2"><MessageCircle size={18} /></span>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-400 break-words">{activeConversations.length}</p>
          <p className="text-xs text-gray-500 mt-1">Conversas ativas</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
          <span className="inline-flex p-2 rounded-xl bg-purple-500/10 text-purple-400 mb-2"><UserPlus size={18} /></span>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-400 break-words">{newLeads30d}</p>
          <p className="text-xs text-gray-500 mt-1">Novos leads (30d)</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
          <span className="inline-flex p-2 rounded-xl bg-amber-500/10 text-amber-400 mb-2"><Wallet size={18} /></span>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-400 break-words">{formatBRL(openValue)}</p>
          <p className="text-xs text-gray-500 mt-1">Em negociação</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
          <span className="inline-flex p-2 rounded-xl bg-green-500/10 text-green-400 mb-2"><Trophy size={18} /></span>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-400 break-words">{winRate30d === null ? "—" : `${(winRate30d * 100).toFixed(0)}%`}</p>
          <p className="text-xs text-gray-500 mt-1">Taxa de vitória (30d)</p>
        </div>
      </div>

      {/* Meta do mês */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold flex items-center gap-2"><Goal size={17} className="text-blue-400" /> Meta do mês</p>
          <Link href={`/crm/${agentId}/metas`} className="text-xs text-blue-400 hover:text-blue-300">Configurar metas →</Link>
        </div>

        {metaGeralPct === null && metasComVendedor.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhuma meta configurada ainda. Defina uma em &quot;Configurar metas&quot;.</p>
        ) : (
          <div className="space-y-3">
            {metaGeralPct !== null && (
              <div>
                <div className="flex items-center justify-between text-sm mb-1 gap-2">
                  <p className="text-gray-300 flex-shrink-0">Meta geral</p>
                  <p className="text-gray-400 text-right break-words">{formatBRL(wonThisMonthTotal)} / {formatBRL(config.metaGeralMensal)}</p>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${metaGeralPct >= 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${metaGeralPct}%` }} />
                </div>
              </div>
            )}
            {metasComVendedor.map(m => (
              <div key={m.id}>
                <div className="flex items-center justify-between text-sm mb-1 gap-2">
                  <p className="text-gray-300 truncate flex-shrink-0">{m.name}</p>
                  <p className="text-gray-400 text-right break-words">{formatBRL(m.atingido)} / {formatBRL(m.meta)}</p>
                </div>
                <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.pct >= 100 ? "bg-green-500" : "bg-blue-500/70"}`} style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Atendimento */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <p className="font-semibold flex items-center gap-2"><Headset size={17} className="text-blue-400" /> Atendimento</p>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <p className="w-16 text-xs text-gray-400 flex items-center gap-1 flex-shrink-0"><Bot size={12} /> IA</p>
              <div className="flex-1 h-6 bg-gray-950 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg bg-blue-600/50 flex items-center px-2"
                  style={{ width: `${Math.max(6, activeConversations.length > 0 ? (iaCount / activeConversations.length) * 100 : 0)}%` }}
                >
                  <span className="text-[10px] font-bold">{iaCount}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="w-16 text-xs text-gray-400 flex items-center gap-1 flex-shrink-0"><UserCheck size={12} /> Humano</p>
              <div className="flex-1 h-6 bg-gray-950 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg bg-amber-600/50 flex items-center px-2"
                  style={{ width: `${Math.max(6, activeConversations.length > 0 ? (humanCount / activeConversations.length) * 100 : 0)}%` }}
                >
                  <span className="text-[10px] font-bold">{humanCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-sm">
            <p className="text-gray-400">Conversas com follow-up disparado</p>
            <p className="font-semibold">{convFollowupCount}</p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-400">Oportunidades com follow-up de etapa</p>
            <p className="font-semibold">{stageFollowupCount}</p>
          </div>
        </div>

        {/* Equipe */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <p className="font-semibold flex items-center gap-2"><Users2 size={17} className="text-blue-400" /> Equipe</p>

          <div>
            <p className="text-xs text-gray-500 mb-2">Ranking por valor ganho</p>
            {ranking.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhuma negociação ganha ainda.</p>
            ) : (
              <div className="space-y-2">
                {ranking.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <p className="w-28 text-xs text-gray-300 truncate flex-shrink-0 flex items-center gap-1">
                      {i === 0 && <Trophy size={11} className="text-amber-400 flex-shrink-0" />}
                      {r.name}
                    </p>
                    <div className="flex-1 h-6 bg-gray-950 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg bg-green-600/50 flex items-center px-2"
                        style={{ width: `${Math.max(8, (r.total / rankingMaxTotal) * 100)}%` }}
                      >
                        <span className="text-[10px] font-bold">{formatBRL(r.total)}</span>
                      </div>
                    </div>
                    <span className="w-16 text-[11px] text-gray-500 flex-shrink-0 text-right">{r.count} {r.count === 1 ? "venda" : "vendas"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><ListTodo size={12} /> Tarefas pendentes por vendedor</p>
            {pendingByAttendant.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhuma tarefa pendente.</p>
            ) : (
              <div className="space-y-1.5">
                {pendingByAttendant.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <p className="text-gray-300 truncate">{p.name}</p>
                    <p className="font-semibold text-amber-400 flex-shrink-0">{p.count}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leads/funil */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <p className="font-semibold flex items-center gap-2"><Filter size={17} className="text-purple-400" /> Leads</p>
        <div>
          <p className="text-xs text-gray-500 mb-2">Novos leads por semana</p>
          <WeeklyBarChart data={weekBuckets.map(w => ({ semana: w.semana, total: w.total }))} />
        </div>
        <div className="pt-2 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">Leads por status</p>
          {leadsByStatus.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum lead com status atribuído ainda.</p>
          ) : (
            <div className="space-y-2">
              {leadsByStatus.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <p className="w-32 text-xs text-gray-300 truncate flex-shrink-0">{s.name}</p>
                  <div className="flex-1 h-6 bg-gray-950 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg flex items-center px-2"
                      style={{ width: `${Math.max(8, (s.count / leadsByStatusMax) * 100)}%`, backgroundColor: `${s.color}66` }}
                    >
                      <span className="text-[10px] font-bold">{s.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline/vendas */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold flex items-center gap-2"><KanbanSquare size={17} className="text-amber-400" /> Pipeline &amp; Vendas</p>
          <Link href={`/crm/${agentId}/vendas`} className="text-xs text-blue-400 hover:text-blue-300">Ver detalhes completos →</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-2">Ganhos x perdidos (30d)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <p className="w-14 text-xs text-gray-400 flex-shrink-0">Ganhos</p>
                <div className="flex-1 h-6 bg-gray-950 rounded-lg overflow-hidden">
                  <div className="h-full rounded-lg bg-green-600/50 flex items-center px-2" style={{ width: `${Math.max(6, (won30d.length / ganhoPerdaMax) * 100)}%` }}>
                    <span className="text-[10px] font-bold">{won30d.length}</span>
                  </div>
                </div>
                <span className="text-[11px] text-gray-500 flex-shrink-0">{formatBRL(won30dTotal)}</span>
              </div>
              <div className="flex items-center gap-3">
                <p className="w-14 text-xs text-gray-400 flex-shrink-0">Perdidos</p>
                <div className="flex-1 h-6 bg-gray-950 rounded-lg overflow-hidden">
                  <div className="h-full rounded-lg bg-red-600/40 flex items-center px-2" style={{ width: `${Math.max(6, (lost30d.length / ganhoPerdaMax) * 100)}%` }}>
                    <span className="text-[10px] font-bold">{lost30d.length}</span>
                  </div>
                </div>
                <span className="text-[11px] text-gray-500 flex-shrink-0">{formatBRL(lost30dTotal)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center items-start bg-gray-950 rounded-xl p-4 min-w-0">
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-400 break-words">{formatBRL(ticketMedio)}</p>
            <p className="text-xs text-gray-500 mt-1">Ticket médio (todas as vendas)</p>
          </div>
        </div>
      </div>
    </>
  );
}
