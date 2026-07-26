import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, Wallet, TrendingUp, TrendingDown, Handshake, Users } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { DailyWonLostChart, AttendantDonutChart } from "../../dashboards/DashboardCharts";
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

  const [opportunities, team] = await Promise.all([
    prisma.opportunity.findMany({
      where: { conversation: { agentConfigId: config.id } },
      select: {
        id: true, dealValue: true, wonAt: true, lostAt: true, createdAt: true,
        conversation: { select: { assignedToId: true, contactName: true, contactNumber: true } },
      },
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

  // Dados diários: valor ganho/perdido por dia dentro do período selecionado
  const dayBuckets = Array.from({ length: periodDays }, (_, i) => {
    const day = new Date(from.getTime() + i * DAY_MS);
    return { day, ganho: 0, perdido: 0, dia: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) };
  });
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  for (const o of wonCur) {
    const bucket = dayBuckets.find(b => o.wonAt && sameDay(b.day, o.wonAt));
    if (bucket) bucket.ganho += o.dealValue;
  }
  for (const o of lostCur) {
    const bucket = dayBuckets.find(b => o.lostAt && sameDay(b.day, o.lostAt));
    if (bucket) bucket.perdido += o.dealValue;
  }
  const tickInterval = periodDays > 20 ? Math.ceil(periodDays / 15) - 1 : 0;

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

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="font-semibold mb-3">Dados diários — ganhos x perdidos</p>
          {dayBuckets.every(d => d.ganho === 0 && d.perdido === 0) ? (
            <p className="text-sm text-gray-600">Nenhuma negociação ganha ou perdida nesse período.</p>
          ) : (
            <DailyWonLostChart data={dayBuckets.map(b => ({ dia: b.dia, ganho: b.ganho, perdido: b.perdido }))} tickInterval={tickInterval} />
          )}
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
      </div>
    </div>
  );
}
