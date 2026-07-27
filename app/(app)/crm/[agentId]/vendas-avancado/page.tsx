import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, Wallet, TrendingUp, TrendingDown, Handshake, Users, KanbanSquare, DollarSign, Repeat, Percent } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { DailyWonLostChart, AttendantDonutChart, GaugeChart } from "../../dashboards/DashboardCharts";
import { DateRangePicker } from "../../dashboards/DateRangePicker";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const positive = pct >= 0;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${positive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {positive ? "+" : ""}{pct.toFixed(2)}%
    </span>
  );
}

export default function VendasAvancadoPage(props: { params: Promise<{ agentId: string }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  return (
    <CrmPageGate pageKey="vendasavancado">
      <VendasAvancadoPageContent {...props} />
    </CrmPageGate>
  );
}

async function VendasAvancadoPageContent({ params, searchParams }: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <BarChart3 size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento para ver o dashboard de vendas aqui.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const now = new Date();
  const to = sp.to ? new Date(`${sp.to}T23:59:59.999`) : now;
  const from = sp.from ? new Date(`${sp.from}T00:00:00`) : new Date(to.getTime() - 29 * DAY_MS);
  const periodDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1);
  const prevTo = new Date(from.getTime() - DAY_MS);
  const prevFrom = new Date(prevTo.getTime() - (periodDays - 1) * DAY_MS);

  const [opportunities, conversations, team] = await Promise.all([
    prisma.opportunity.findMany({
      where: { conversation: { agentConfigId: config.id } },
      select: {
        id: true, conversationId: true, dealValue: true, wonAt: true, lostAt: true, createdAt: true, stageId: true, stageEnteredAt: true,
        stage: { select: { name: true, color: true, order: true, pipeline: { select: { name: true } } } },
        conversation: { select: { assignedToId: true, contactName: true, contactNumber: true } },
      },
    }),
    prisma.conversation.findMany({
      where: { agentConfigId: config.id },
      select: { id: true, createdAt: true, assignedToId: true },
    }),
    prisma.team.findUnique({
      where: { id: config.teamId },
      include: { manager: { select: { id: true, name: true } }, members: { include: { profile: { select: { id: true, name: true } } } } },
    }),
  ]);

  const nameById = new Map<string, string>();
  if (team) {
    nameById.set(team.manager.id, team.manager.name);
    for (const m of team.members) nameById.set(m.profile.id, m.profile.name);
  }

  const inRange = (d: Date | null, start: Date, end: Date) => d !== null && d >= start && d <= end;

  // KPIs do período selecionado vs período anterior de mesma duração
  const createdCur = opportunities.filter(o => inRange(o.createdAt, from, to));
  const createdPrev = opportunities.filter(o => inRange(o.createdAt, prevFrom, prevTo));
  const wonCur = opportunities.filter(o => inRange(o.wonAt, from, to));
  const wonPrev = opportunities.filter(o => inRange(o.wonAt, prevFrom, prevTo));
  const lostCur = opportunities.filter(o => inRange(o.lostAt, from, to));
  const lostPrev = opportunities.filter(o => inRange(o.lostAt, prevFrom, prevTo));
  const openNow = opportunities.filter(o => !o.wonAt && !o.lostAt);

  const sum = (list: typeof opportunities) => list.reduce((s, o) => s + o.dealValue, 0);

  const kpis = [
    { label: "Total de negócios", count: createdCur.length, total: sum(createdCur), pct: pctChange(sum(createdCur), sum(createdPrev)), icon: BarChart3, color: "blue" },
    { label: "Total ganhos", count: wonCur.length, total: sum(wonCur), pct: pctChange(sum(wonCur), sum(wonPrev)), icon: Handshake, color: "green" },
    { label: "Total perdidos", count: lostCur.length, total: sum(lostCur), pct: pctChange(sum(lostCur), sum(lostPrev)), icon: TrendingDown, color: "red" },
    { label: "Total em aberto", count: openNow.length, total: sum(openNow), pct: null, icon: Wallet, color: "amber" },
  ];
  const COLOR_CLASSES: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400", green: "bg-green-500/10 text-green-400",
    red: "bg-red-500/10 text-red-400", amber: "bg-amber-500/10 text-amber-400",
  };
  const TEXT_CLASSES: Record<string, string> = {
    blue: "text-blue-400", green: "text-green-400", red: "text-red-400", amber: "text-amber-400",
  };

  // Dados diários: valor ganho/perdido por dia dentro do período selecionado. Períodos longos
  // (>35 dias) agrupam por semana em vez de dia, senão o gráfico vira barras finas ilegíveis no celular.
  const bucketDays = periodDays > 35 ? 7 : 1;
  const bucketCount = Math.ceil(periodDays / bucketDays);
  const dayBuckets = Array.from({ length: bucketCount }, (_, i) => {
    const bucketStart = new Date(from.getTime() + i * bucketDays * DAY_MS);
    const bucketEnd = new Date(Math.min(bucketStart.getTime() + bucketDays * DAY_MS, to.getTime() + DAY_MS));
    const label = bucketStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return { start: bucketStart, end: bucketEnd, ganho: 0, perdido: 0, dia: label };
  });
  for (const o of wonCur) {
    const bucket = dayBuckets.find(b => o.wonAt && o.wonAt >= b.start && o.wonAt < b.end);
    if (bucket) bucket.ganho += o.dealValue;
  }
  for (const o of lostCur) {
    const bucket = dayBuckets.find(b => o.lostAt && o.lostAt >= b.start && o.lostAt < b.end);
    if (bucket) bucket.perdido += o.dealValue;
  }
  const tickInterval = bucketCount > 20 ? Math.ceil(bucketCount / 15) - 1 : 0;

  // Percentual por atendente: negócios ganhos no período, por quem estava atribuído
  const attendantMap = new Map<string, number>();
  for (const o of wonCur) {
    const id = o.conversation.assignedToId ?? "__sem__";
    attendantMap.set(id, (attendantMap.get(id) ?? 0) + 1);
  }
  const attendantData = Array.from(attendantMap.entries())
    .map(([id, value]) => ({ name: id === "__sem__" ? "Sem atendente" : (nameById.get(id) ?? "Ex-membro"), value }))
    .sort((a, b) => b.value - a.value);

  // Principais clientes: maior valor ganho no período
  const clientMap = new Map<string, { name: string; count: number; total: number }>();
  for (const o of wonCur) {
    const key = o.conversation.contactNumber;
    const entry = clientMap.get(key) ?? { name: o.conversation.contactName || key, count: 0, total: 0 };
    entry.count += 1;
    entry.total += o.dealValue;
    clientMap.set(key, entry);
  }
  const topClientes = Array.from(clientMap.values()).sort((a, b) => b.total - a.total).slice(0, 8);
  const topClientesMax = Math.max(1, ...topClientes.map(c => c.total));

  // Negócios por etapa do funil — situação atual (aberto agora), não depende do período selecionado
  const stageGroups = new Map<string, { name: string; color: string; order: number; pipelineName: string; count: number; total: number; daysSum: number }>();
  for (const o of openNow) {
    const key = o.stageId ?? "__sem_etapa__";
    const group = stageGroups.get(key) ?? {
      name: o.stage?.name ?? "Sem etapa",
      color: o.stage?.color ?? "#6b7280",
      order: o.stage?.order ?? Number.MAX_SAFE_INTEGER,
      pipelineName: o.stage?.pipeline.name ?? "",
      count: 0, total: 0, daysSum: 0,
    };
    group.count += 1;
    group.total += o.dealValue;
    group.daysSum += Math.max(0, Math.floor((now.getTime() - o.stageEnteredAt.getTime()) / DAY_MS));
    stageGroups.set(key, group);
  }
  const openByStage = Array.from(stageGroups.values()).sort((a, b) => a.order - b.order);
  const multiplePipelines = new Set(openByStage.map(s => s.pipelineName)).size > 1;
  const openByStageMax = Math.max(1, ...openByStage.map(s => s.total));

  // Meta geral do mês — sempre pelo mês calendário corrente, independente do período selecionado
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const wonThisMonth = opportunities.filter(o => o.wonAt && o.wonAt >= startOfMonth);
  const wonThisMonthTotal = wonThisMonth.reduce((s, o) => s + o.dealValue, 0);
  const metaPct = config.metaGeralMensal > 0 ? (wonThisMonthTotal / config.metaGeralMensal) * 100 : null;

  // CAC (mês corrente, só geral — não há investimento configurável por vendedor)
  const clientesNovosMes = new Set(wonThisMonth.map(o => o.conversation.contactNumber)).size;
  const cac = config.investimentoMensal > 0 && clientesNovosMes > 0 ? config.investimentoMensal / clientesNovosMes : null;

  // LTV: valor total ganho por cliente (todo o histórico, não depende do período selecionado)
  const wonAllTime = opportunities.filter(o => o.wonAt);
  const ltvByClient = new Map<string, number>();
  for (const o of wonAllTime) {
    ltvByClient.set(o.conversation.contactNumber, (ltvByClient.get(o.conversation.contactNumber) ?? 0) + o.dealValue);
  }
  const ltvGeral = ltvByClient.size > 0 ? Array.from(ltvByClient.values()).reduce((s, v) => s + v, 0) / ltvByClient.size : null;

  const ltvPorVendedorAcc = new Map<string, Map<string, number>>(); // vendedorId -> (contactNumber -> total)
  for (const o of wonAllTime) {
    const vendedorId = o.conversation.assignedToId ?? "__sem__";
    const clientMap = ltvPorVendedorAcc.get(vendedorId) ?? new Map<string, number>();
    clientMap.set(o.conversation.contactNumber, (clientMap.get(o.conversation.contactNumber) ?? 0) + o.dealValue);
    ltvPorVendedorAcc.set(vendedorId, clientMap);
  }
  const ltvPorVendedor = Array.from(ltvPorVendedorAcc.entries())
    .map(([id, clientMap]) => ({
      id,
      name: id === "__sem__" ? "Sem atendente" : (nameById.get(id) ?? "Ex-membro"),
      ltv: Array.from(clientMap.values()).reduce((s, v) => s + v, 0) / clientMap.size,
      clientes: clientMap.size,
    }))
    .sort((a, b) => b.ltv - a.ltv);

  // Taxa de conversão (leads → clientes): dos leads que entraram no período selecionado,
  // quantos já viraram cliente (têm ao menos 1 negócio ganho), até hoje
  const wonConversationIds = new Set(wonAllTime.map(o => o.conversationId));
  const leadsNoPeriodo = conversations.filter(c => inRange(c.createdAt, from, to));
  const convertidosNoPeriodo = leadsNoPeriodo.filter(c => wonConversationIds.has(c.id));
  const taxaConversaoGeral = leadsNoPeriodo.length > 0 ? (convertidosNoPeriodo.length / leadsNoPeriodo.length) * 100 : null;

  const conversaoPorVendedorMap = new Map<string, { leads: number; convertidos: number }>();
  for (const c of leadsNoPeriodo) {
    const id = c.assignedToId ?? "__sem__";
    const entry = conversaoPorVendedorMap.get(id) ?? { leads: 0, convertidos: 0 };
    entry.leads += 1;
    if (wonConversationIds.has(c.id)) entry.convertidos += 1;
    conversaoPorVendedorMap.set(id, entry);
  }
  const conversaoPorVendedor = Array.from(conversaoPorVendedorMap.entries())
    .map(([id, v]) => ({
      id,
      name: id === "__sem__" ? "Sem atendente" : (nameById.get(id) ?? "Ex-membro"),
      pct: (v.convertidos / v.leads) * 100,
      leads: v.leads,
      convertidos: v.convertidos,
    }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-gray-400 text-sm">Dashboards</p>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><BarChart3 size={28} className="text-blue-400" /> Vendas</h1>
            <p className="text-gray-400 mt-1">Desempenho comercial no período, comparado ao período anterior de mesma duração.</p>
          </div>
          <DateRangePicker from={from.toISOString()} to={to.toISOString()} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex p-2 rounded-xl ${COLOR_CLASSES[k.color]}`}><k.icon size={18} /></span>
                <ChangeBadge pct={k.pct} />
              </div>
              <p className={`text-2xl font-bold ${TEXT_CLASSES[k.color]}`}>{formatBRL(k.total)}</p>
              <p className="text-xs text-gray-500 mt-1">{k.label} · {k.count} {k.count === 1 ? "negócio" : "negócios"}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
            <p className="font-semibold self-start mb-1">Meta geral do mês</p>
            {metaPct === null ? (
              <div className="py-8">
                <p className="text-sm text-gray-600">Nenhuma meta configurada.</p>
                <Link href={`/crm/${agentId}/metas`} className="text-xs text-blue-400 hover:text-blue-300">Configurar meta →</Link>
              </div>
            ) : (
              <>
                <GaugeChart pct={metaPct} />
                <p className="text-xs text-gray-500 -mt-2">{formatBRL(wonThisMonthTotal)} de {formatBRL(config.metaGeralMensal)}</p>
              </>
            )}
          </div>

          <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="font-semibold mb-3">{bucketDays === 1 ? "Dados diários" : "Dados semanais"} — ganhos x perdidos</p>
            {dayBuckets.every(d => d.ganho === 0 && d.perdido === 0) ? (
              <p className="text-sm text-gray-600">Nenhuma negociação ganha ou perdida nesse período.</p>
            ) : (
              <DailyWonLostChart data={dayBuckets.map(b => ({ dia: b.dia, ganho: b.ganho, perdido: b.perdido }))} tickInterval={tickInterval} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex p-2 rounded-xl bg-amber-500/10 text-amber-400"><KanbanSquare size={18} /></span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{openNow.length}</p>
            <p className="text-xs text-gray-500 mt-1">Oportunidades abertas · situação atual</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex p-2 rounded-xl bg-red-500/10 text-red-400"><DollarSign size={18} /></span>
            </div>
            <p className="text-2xl font-bold text-red-400">{cac === null ? "—" : formatBRL(cac)}</p>
            <p className="text-xs text-gray-500 mt-1">CAC (mês atual) · {clientesNovosMes} {clientesNovosMes === 1 ? "cliente novo" : "clientes novos"}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex p-2 rounded-xl bg-green-500/10 text-green-400"><Repeat size={18} /></span>
            </div>
            <p className="text-2xl font-bold text-green-400">{ltvGeral === null ? "—" : formatBRL(ltvGeral)}</p>
            <p className="text-xs text-gray-500 mt-1">LTV médio · {ltvByClient.size} {ltvByClient.size === 1 ? "cliente" : "clientes"}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex p-2 rounded-xl bg-blue-500/10 text-blue-400"><Percent size={18} /></span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{taxaConversaoGeral === null ? "—" : `${taxaConversaoGeral.toFixed(1)}%`}</p>
            <p className="text-xs text-gray-500 mt-1">Taxa de conversão · {convertidosNoPeriodo.length} de {leadsNoPeriodo.length} leads</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="font-semibold mb-1">LTV por vendedor</p>
            <p className="text-xs text-gray-500 mb-3">Valor médio ganho por cliente (histórico completo).</p>
            {ltvPorVendedor.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhum negócio ganho ainda.</p>
            ) : (
              <div className="space-y-2">
                {ltvPorVendedor.map(v => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <p className="text-gray-300 truncate">{v.name}</p>
                    <p className="font-semibold text-green-400 flex-shrink-0">{formatBRL(v.ltv)} <span className="text-xs text-gray-500 font-normal">({v.clientes} {v.clientes === 1 ? "cliente" : "clientes"})</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="font-semibold mb-1">Taxa de conversão por vendedor</p>
            <p className="text-xs text-gray-500 mb-3">Leads do período selecionado que já viraram cliente.</p>
            {conversaoPorVendedor.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhum lead no período.</p>
            ) : (
              <div className="space-y-2">
                {conversaoPorVendedor.map(v => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <p className="text-gray-300 truncate">{v.name}</p>
                    <p className="font-semibold text-blue-400 flex-shrink-0">{v.pct.toFixed(1)}% <span className="text-xs text-gray-500 font-normal">({v.convertidos}/{v.leads})</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="font-semibold mb-1">Percentual por atendente</p>
            <p className="text-xs text-gray-500 mb-2">Negócios ganhos no período, por quem estava atribuído.</p>
            {attendantData.length === 0 ? (
              <p className="text-sm text-gray-600 py-8 text-center">Nenhum negócio ganho no período.</p>
            ) : (
              <AttendantDonutChart data={attendantData} />
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="font-semibold mb-1 flex items-center gap-2"><Users size={16} className="text-purple-400" /> Principais clientes</p>
            <p className="text-xs text-gray-500 mb-3">Maior valor ganho no período.</p>
            {topClientes.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhum negócio ganho no período.</p>
            ) : (
              <div className="space-y-2">
                {topClientes.map(c => (
                  <div key={c.name} className="flex items-center gap-3">
                    <p className="w-32 text-xs text-gray-300 truncate flex-shrink-0">{c.name}</p>
                    <div className="flex-1 h-6 bg-gray-950 rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg bg-purple-600/50 flex items-center px-2" style={{ width: `${Math.max(10, (c.total / topClientesMax) * 100)}%` }}>
                        <span className="text-[10px] font-bold">{formatBRL(c.total)}</span>
                      </div>
                    </div>
                    <span className="w-16 text-[11px] text-gray-500 flex-shrink-0 text-right">{c.count} {c.count === 1 ? "negócio" : "negócios"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <p className="font-semibold flex items-center gap-2"><KanbanSquare size={17} className="text-amber-400" /> Negócios por etapa do funil</p>
            <span className="text-[10px] text-gray-500">Situação atual — não depende do período selecionado</span>
          </div>
          {openByStage.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 pb-5">Nenhuma negociação em aberto no momento.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {openByStage.map(s => (
                <div key={`${s.pipelineName}-${s.name}`} className="flex items-center justify-between gap-3 px-5 py-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <p className="text-sm font-medium truncate">{s.name}{multiplePipelines && s.pipelineName && ` (${s.pipelineName})`}</p>
                    <span className="text-xs text-gray-500 flex-shrink-0">{s.count} {s.count === 1 ? "negócio" : "negócios"}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs text-gray-500">{Math.round(s.daysSum / s.count)}d média na etapa</span>
                    <div className="w-32 h-5 bg-gray-950 rounded-lg overflow-hidden hidden sm:block">
                      <div className="h-full rounded-lg bg-amber-600/50" style={{ width: `${Math.max(10, (s.total / openByStageMax) * 100)}%` }} />
                    </div>
                    <p className="text-sm font-semibold text-amber-400 w-24 text-right">{formatBRL(s.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
