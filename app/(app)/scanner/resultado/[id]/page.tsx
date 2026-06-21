"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from "recharts";
import Link from "next/link";

type Action = { title: string; area: string; priority: "ALTA" | "MEDIA" | "BAIXA"; description: string; timeframe: string };
type Classification = "CRITICO" | "ATENCAO" | "FORTE";

type DiagnosticData = {
  companyName: string;
  segment: string;
  teamSize: string;
  diagnosticType: "EMPRESA" | "VENDEDOR";
  scoreLeads: number;
  scoreProcess: number;
  scoreTeam: number;
  scoreKpis: number;
  scoreTools: number;
  scoreValue: number;
  scoreRetention: number;
  scoreMoney: number;
  scoreTotal: number;
  createdAt: string;
  result: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    priority: string;
    actions: Action[];
    classification: Record<string, Classification>;
    insights: Record<string, string>;
  } | null;
};

const AREAS_EMPRESA = [
  { key: "leads",     label: "Geração de Leads",    scoreKey: "scoreLeads",     icon: "🎯" },
  { key: "process",   label: "Processo de Vendas",  scoreKey: "scoreProcess",   icon: "⚙️" },
  { key: "team",      label: "Equipe",               scoreKey: "scoreTeam",      icon: "👥" },
  { key: "kpis",      label: "KPIs & Dados",         scoreKey: "scoreKpis",      icon: "📊" },
  { key: "tools",     label: "Ferramentas",           scoreKey: "scoreTools",     icon: "🔧" },
  { key: "value",     label: "Proposta de Valor",    scoreKey: "scoreValue",     icon: "💎" },
  { key: "retention", label: "Retenção",              scoreKey: "scoreRetention", icon: "🔄" },
  { key: "money",     label: "Dinheiro na Mesa",      scoreKey: "scoreMoney",     icon: "💰" },
];

const AREAS_VENDEDOR = [
  { key: "leads",     label: "Prospecção Ativa",       scoreKey: "scoreLeads",     icon: "🎯" },
  { key: "process",   label: "Qualificação",            scoreKey: "scoreProcess",   icon: "🔍" },
  { key: "value",     label: "Pitch & Proposta",        scoreKey: "scoreValue",     icon: "💎" },
  { key: "team",      label: "Negociação & Objeções",   scoreKey: "scoreTeam",      icon: "🥊" },
  { key: "kpis",      label: "Fechamento & Follow-up",  scoreKey: "scoreKpis",      icon: "🏁" },
  { key: "tools",     label: "Ferramentas",              scoreKey: "scoreTools",     icon: "🔧" },
  { key: "retention", label: "Desenvolvimento Contínuo",scoreKey: "scoreRetention", icon: "📈" },
];

const CLASS_STYLE: Record<Classification, { bg: string; text: string; border: string; badge: string; label: string }> = {
  CRITICO: { bg: "bg-red-950/30", text: "text-red-300", border: "border-red-800", badge: "bg-red-900/50 text-red-300 border-red-700", label: "Crítico" },
  ATENCAO: { bg: "bg-yellow-950/30", text: "text-yellow-300", border: "border-yellow-800", badge: "bg-yellow-900/50 text-yellow-300 border-yellow-700", label: "Atenção" },
  FORTE:   { bg: "bg-green-950/30",  text: "text-green-300",  border: "border-green-800",  badge: "bg-green-900/50 text-green-300 border-green-700",  label: "Forte" },
};

const PRIORITY_STYLE: Record<string, string> = {
  ALTA:  "bg-red-900/40 text-red-300 border-red-700",
  MEDIA: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  BAIXA: "bg-blue-900/40 text-blue-300 border-blue-700",
};

type SalesLevel = "JUNIOR" | "PLENO" | "SENIOR";

const SALES_LEVELS: Record<SalesLevel, {
  label: string; icon: string; color: string; border: string; bg: string; glow: string;
  desc: string; nextLevel: SalesLevel | null; nextThreshold: number;
}> = {
  JUNIOR: {
    label: "Júnior", icon: "🌱", color: "text-orange-300", border: "border-orange-600",
    bg: "from-orange-950/40 to-gray-900", glow: "shadow-orange-500/20",
    desc: "Você está desenvolvendo as habilidades fundamentais de vendas. O diagnóstico mostra áreas importantes para focar agora.",
    nextLevel: "PLENO", nextThreshold: 50,
  },
  PLENO: {
    label: "Pleno", icon: "🔥", color: "text-blue-300", border: "border-blue-600",
    bg: "from-blue-950/40 to-gray-900", glow: "shadow-blue-500/20",
    desc: "Você tem uma base sólida e já gera resultados consistentes. Com foco nas lacunas identificadas, você chegará ao nível Sênior.",
    nextLevel: "SENIOR", nextThreshold: 75,
  },
  SENIOR: {
    label: "Sênior", icon: "⭐", color: "text-yellow-300", border: "border-yellow-500",
    bg: "from-yellow-950/40 to-gray-900", glow: "shadow-yellow-500/20",
    desc: "Você domina as principais técnicas de vendas e é referência. Mantenha a evolução e compartilhe seu conhecimento com a equipe.",
    nextLevel: null, nextThreshold: 100,
  },
};

function getSalesLevel(score: number): SalesLevel {
  if (score >= 75) return "SENIOR";
  if (score >= 50) return "PLENO";
  return "JUNIOR";
}

const OVERALL_STYLE: Record<string, { color: string; bg: string; label: string; desc: string }> = {
  CRITICO:   { color: "text-red-400",    bg: "border-red-700 bg-red-950/20",       label: "Crítico",   desc: "Ação imediata necessária" },
  ATENCAO:   { color: "text-yellow-400", bg: "border-yellow-700 bg-yellow-950/20", label: "Atenção",   desc: "Melhorias urgentes identificadas" },
  BOM:       { color: "text-blue-400",   bg: "border-blue-700 bg-blue-950/20",     label: "Bom",       desc: "Base sólida, oportunidades de crescimento" },
  EXCELENTE: { color: "text-green-400",  bg: "border-green-700 bg-green-950/20",   label: "Excelente", desc: "Nível avançado de maturidade" },
};

export default function ResultadoPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/scanner/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Não foi possível carregar o diagnóstico."); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4 text-white">
          <div className="text-5xl animate-pulse">📊</div>
          <p className="text-lg">Carregando diagnóstico...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error || "Diagnóstico não encontrado."}</p>
          <Link href="/scanner" className="text-blue-400 underline">Voltar para o Scanner</Link>
        </div>
      </div>
    );
  }

  const isVendedor = data.diagnosticType === "VENDEDOR";
  const AREAS = isVendedor ? AREAS_VENDEDOR : AREAS_EMPRESA;

  const radarData = AREAS.map((a) => ({
    subject: a.label.split(" ")[0], // primeira palavra para caber no radar
    score: data[a.scoreKey as keyof DiagnosticData] as number,
    fullMark: 100,
  }));

  const overall = OVERALL_STYLE[data.result?.priority ?? "ATENCAO"];
  const result = data.result;
  const classification = result?.classification ?? {};
  const insights = result?.insights ?? {};
  const actions: Action[] = result?.actions ?? [];
  const strengths: string[] = result?.strengths ?? [];
  const weaknesses: string[] = result?.weaknesses ?? [];

  const critCount = Object.values(classification).filter((c) => c === "CRITICO").length;
  const atCount   = Object.values(classification).filter((c) => c === "ATENCAO").length;
  const okCount   = Object.values(classification).filter((c) => c === "FORTE").length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto p-6 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium border-gray-700 text-gray-400">
                {isVendedor ? "Auto-diagnóstico individual" : "Diagnóstico empresarial"}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(data.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
            </div>
            <h1 className="text-3xl font-bold">
              {isVendedor ? "Meu diagnóstico de vendas" : data.companyName}
            </h1>
            <p className="text-gray-400">
              {isVendedor ? `Segmento: ${data.segment}` : `${data.segment} • ${data.teamSize} pessoas na equipe`}
            </p>
          </div>
          <Link href="/scanner/novo" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors">
            + Novo diagnóstico
          </Link>
        </div>

        {/* ── NÍVEL DO VENDEDOR ─────────────────────────────────────────── */}
        {isVendedor && (() => {
          const levelKey = getSalesLevel(data.scoreTotal);
          const level = SALES_LEVELS[levelKey];
          const prevThreshold = levelKey === "JUNIOR" ? 0 : levelKey === "PLENO" ? 50 : 75;
          const rangeSize = level.nextThreshold - prevThreshold;
          const progressInRange = data.scoreTotal - prevThreshold;
          const pct = level.nextLevel ? Math.round((progressInRange / rangeSize) * 100) : 100;

          return (
            <div className={`rounded-2xl border bg-gradient-to-br ${level.bg} ${level.border} p-6 shadow-xl ${level.glow}`}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {/* Badge de nível */}
                  <div className={`w-20 h-20 rounded-2xl border-2 ${level.border} bg-black/30 flex flex-col items-center justify-center flex-shrink-0`}>
                    <span className="text-3xl">{level.icon}</span>
                    <span className={`text-xs font-bold ${level.color} mt-1`}>{level.label.toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Nível atual</span>
                    </div>
                    <p className={`text-3xl font-black ${level.color}`}>{level.label}</p>
                    <p className="text-sm text-gray-400 mt-1 max-w-xs leading-snug">{level.desc}</p>
                  </div>
                </div>

                {/* Progresso para o próximo nível */}
                <div className="flex-shrink-0 min-w-[180px]">
                  {level.nextLevel ? (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500">Progresso para {SALES_LEVELS[level.nextLevel].label}</span>
                        <span className={`text-sm font-bold ${level.color}`}>{pct}%</span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${levelKey === "JUNIOR" ? "bg-orange-500" : "bg-blue-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-600">{prevThreshold} pts</span>
                        <span className="text-xs text-gray-600">{level.nextThreshold} pts</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Faltam <span className={`font-bold ${level.color}`}>{level.nextThreshold - data.scoreTotal} pts</span> para {SALES_LEVELS[level.nextLevel].label}
                      </p>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-yellow-400 font-bold text-sm">Nível máximo atingido!</p>
                      <p className="text-xs text-gray-500 mt-1">Score: {data.scoreTotal}/100</p>
                      <div className="h-3 bg-yellow-900/40 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: "100%" }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Linha separadora + scores por nível */}
              <div className="mt-5 pt-4 border-t border-gray-700/50 grid grid-cols-3 gap-3">
                {(["JUNIOR", "PLENO", "SENIOR"] as SalesLevel[]).map((lk) => {
                  const l = SALES_LEVELS[lk];
                  const isActive = lk === levelKey;
                  const isPast = (lk === "JUNIOR" && levelKey !== "JUNIOR") ||
                                 (lk === "PLENO" && levelKey === "SENIOR");
                  return (
                    <div key={lk} className={`text-center p-3 rounded-xl border transition-all ${isActive ? `${l.border} bg-black/20` : "border-gray-800 opacity-50"}`}>
                      <span className="text-xl">{l.icon}</span>
                      <p className={`text-xs font-bold mt-1 ${isActive ? l.color : "text-gray-500"}`}>{l.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {lk === "JUNIOR" ? "0–49 pts" : lk === "PLENO" ? "50–74 pts" : "75–100 pts"}
                      </p>
                      {isPast && <p className="text-xs text-green-500 mt-0.5">✓ Superado</p>}
                      {isActive && <p className={`text-xs mt-0.5 ${l.color}`}>← Você está aqui</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Score geral */}
        <div className={`rounded-2xl border p-6 ${overall.bg}`}>
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-center">
              <p className={`text-7xl font-bold ${overall.color}`}>{data.scoreTotal}</p>
              <p className="text-gray-400 text-sm mt-1">Score geral</p>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${overall.color}`}>{overall.label}</span>
                <span className="text-gray-400 text-sm">— {overall.desc}</span>
              </div>
              {result?.summary && <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>}
              <div className="flex gap-4 pt-1">
                {critCount > 0 && <span className="text-xs text-red-400">🔴 {critCount} crítico{critCount > 1 ? "s" : ""}</span>}
                {atCount > 0  && <span className="text-xs text-yellow-400">🟡 {atCount} atenção</span>}
                {okCount > 0  && <span className="text-xs text-green-400">🟢 {okCount} forte{okCount > 1 ? "s" : ""}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Radar + Barras */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Visão geral por área</h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                  formatter={(v: number) => [`${v}/100`, "Score"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold mb-4">Scores por área</h2>
            {AREAS.map((a) => {
              const score = data[a.scoreKey as keyof DiagnosticData] as number;
              const cls = (classification[a.key] ?? (score < 40 ? "CRITICO" : score < 70 ? "ATENCAO" : "FORTE")) as Classification;
              const s = CLASS_STYLE[cls];
              return (
                <div key={a.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm flex items-center gap-2">{a.icon} {a.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{score}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${s.badge}`}>{s.label}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${cls === "CRITICO" ? "bg-red-500" : cls === "ATENCAO" ? "bg-yellow-500" : "bg-green-500"}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Análise detalhada por área */}
        <div>
          <h2 className="text-xl font-bold mb-4">Análise detalhada por área</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AREAS.map((a) => {
              const cls = (classification[a.key] ?? "ATENCAO") as Classification;
              const s = CLASS_STYLE[cls];
              const insight = insights[a.key] ?? "";
              return (
                <div key={a.key} className={`rounded-xl border p-4 space-y-2 ${s.bg} ${s.border}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-2">{a.icon} {a.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${s.badge}`}>{s.label}</span>
                  </div>
                  {insight && <p className={`text-xs leading-relaxed ${s.text}`}>{insight}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pontos fortes e fracos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-950/20 border border-green-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-green-300 flex items-center gap-2">
              ✅ {isVendedor ? "Suas competências fortes" : "Pontos fortes"}
            </h2>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-green-400 flex-shrink-0">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-red-950/20 border border-red-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-red-300 flex items-center gap-2">
              ⚠️ {isVendedor ? "Onde você está perdendo vendas" : "Principais fraquezas"}
            </h2>
            <ul className="space-y-2">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-red-400 flex-shrink-0">•</span>{w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Plano de ação / Plano de desenvolvimento */}
        <div>
          <h2 className="text-xl font-bold mb-4">
            {isVendedor ? "🚀 Plano de desenvolvimento personalizado" : "🚀 Plano de ação personalizado"}
          </h2>
          <div className="space-y-3">
            {actions.map((action, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400 font-bold text-lg">{i + 1}</span>
                    <div>
                      <p className="font-semibold">{action.title}</p>
                      <p className="text-xs text-gray-500">{action.area} • {action.timeframe}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full border font-medium whitespace-nowrap ${PRIORITY_STYLE[action.priority]}`}>
                    {action.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed pl-8">{action.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA principal — plano de evolução */}
        <div className="bg-gradient-to-br from-blue-950/40 to-purple-950/40 border border-blue-700 rounded-2xl p-6 text-center space-y-4">
          <div className="text-4xl">🎯</div>
          <p className="font-bold text-xl">Seu plano de evolução foi gerado!</p>
          <p className="text-gray-300 text-sm">
            Com base nos pontos críticos identificados, criamos missões personalizadas para corrigir cada problema.
            Conclua as missões, ganhe XP e acompanhe sua evolução.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/missoes" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-colors">
              Ver plano de evolução →
            </Link>
            <Link href="/simulacao" className="px-6 py-3 border border-gray-600 hover:border-gray-400 rounded-xl font-semibold text-sm transition-colors">
              Simulação gamificada
            </Link>
            <Link href="/objecoes" className="px-6 py-3 border border-gray-600 hover:border-gray-400 rounded-xl font-semibold text-sm transition-colors">
              Treinar objeções
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
