"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Handshake, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { DailyWonLostChart, GaugeChart } from "./DashboardCharts";
import { formatBRL } from "./dashboard-utils";

type KpiKey = "criados" | "ganhos" | "perdidos" | "aberto";
type Kpi = { key: KpiKey; label: string; count: number; total: number; pct: number | null; color: string };

const ICONS: Record<KpiKey, typeof BarChart3> = { criados: BarChart3, ganhos: Handshake, perdidos: TrendingDown, aberto: Wallet };
const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-400", green: "bg-green-500/10 text-green-400",
  red: "bg-red-500/10 text-red-400", amber: "bg-amber-500/10 text-amber-400",
};
const TEXT_CLASSES: Record<string, string> = {
  blue: "text-blue-400", green: "text-green-400", red: "text-red-400", amber: "text-amber-400",
};
const RING_CLASSES: Record<string, string> = {
  blue: "ring-2 ring-blue-500", green: "ring-2 ring-green-500", red: "ring-2 ring-red-500", amber: "ring-2 ring-amber-500",
};

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

// Cards de KPI clicáveis — clicar isola aquela métrica no gráfico "Dados diários" abaixo
// (igual ao dashboard de referência que o usuário mostrou). "Total em aberto" não tem uma
// série diária própria (é uma foto do momento, não um fluxo do período), então em vez de
// filtrar o gráfico ele rola a tela até "Negócios por etapa do funil", que já mostra esse
// recorte.
export function VendasKpiChart({ agentId, kpis, dayBuckets, bucketDays, tickInterval, metaPct, wonThisMonthTotal, metaGeralMensal }: {
  agentId: string;
  kpis: Kpi[];
  dayBuckets: { dia: string; ganho: number; perdido: number; criado: number }[];
  bucketDays: number;
  tickInterval: number;
  metaPct: number | null;
  wonThisMonthTotal: number;
  metaGeralMensal: number;
}) {
  const [selected, setSelected] = useState<KpiKey | null>(null);

  function handleClick(key: KpiKey) {
    if (key === "aberto") {
      document.getElementById("negocios-por-etapa")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setSelected(prev => (prev === key ? null : key));
  }

  const metricLabel = selected === "ganhos" ? "ganhos" : selected === "perdidos" ? "perdidos" : selected === "criados" ? "negócios criados" : "ganhos x perdidos";
  const semMovimento = dayBuckets.every(d => d.ganho === 0 && d.perdido === 0 && d.criado === 0);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = ICONS[k.key];
          const isSelected = selected === k.key;
          return (
            <button
              key={k.key}
              onClick={() => handleClick(k.key)}
              className={`text-left bg-gray-900 border rounded-2xl p-5 min-w-0 transition-all ${
                isSelected ? `border-transparent ${RING_CLASSES[k.color]}` : "border-gray-800 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex p-2 rounded-xl ${COLOR_CLASSES[k.color]}`}><Icon size={18} /></span>
                <ChangeBadge pct={k.pct} />
              </div>
              <p className={`text-lg sm:text-xl md:text-2xl font-bold break-words ${TEXT_CLASSES[k.color]}`}>{formatBRL(k.total)}</p>
              <p className="text-xs text-gray-500 mt-1">{k.label} · {k.count} {k.count === 1 ? "negócio" : "negócios"}</p>
            </button>
          );
        })}
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
              <p className="text-xs text-gray-500 -mt-2 break-words text-center">{formatBRL(wonThisMonthTotal)} de {formatBRL(metaGeralMensal)}</p>
            </>
          )}
        </div>

        <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold">{bucketDays === 1 ? "Dados diários" : "Dados semanais"} — {metricLabel}</p>
            {selected && (
              <button onClick={() => setSelected(null)} className="text-xs text-gray-500 hover:text-gray-300">Limpar filtro</button>
            )}
          </div>
          {semMovimento ? (
            <p className="text-sm text-gray-600">Nenhuma movimentação nesse período.</p>
          ) : (
            <DailyWonLostChart data={dayBuckets} tickInterval={tickInterval} metric={selected} />
          )}
        </div>
      </div>
    </>
  );
}
