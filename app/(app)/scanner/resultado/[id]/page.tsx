"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from "recharts";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Award, CheckCircle2, Compass, Flag, Loader2, Lock, Plus, Rocket, Sprout, Flame, Star,
  type LucideIcon,
} from "lucide-react";
import { CentralIcone } from "@/lib/central-icons";
import { MENU_TREINAMENTO_VISIVEL } from "@/lib/menu";
import type { AreaRecomendada } from "@/lib/diagnostico-recomendacoes";
import { IconeArea } from "../../areas";

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
  recomendacoes?: AreaRecomendada[];
};

const AREAS_EMPRESA = [
  { key: "leads",     label: "Geração de Leads",    scoreKey: "scoreLeads"     },
  { key: "process",   label: "Processo de Vendas",  scoreKey: "scoreProcess"   },
  { key: "team",      label: "Equipe",              scoreKey: "scoreTeam"      },
  { key: "kpis",      label: "KPIs & Dados",        scoreKey: "scoreKpis"      },
  { key: "tools",     label: "Ferramentas",         scoreKey: "scoreTools"     },
  { key: "value",     label: "Proposta de Valor",   scoreKey: "scoreValue"     },
  { key: "retention", label: "Retenção",            scoreKey: "scoreRetention" },
  { key: "money",     label: "Dinheiro na Mesa",    scoreKey: "scoreMoney"     },
];

const AREAS_VENDEDOR = [
  { key: "leads",     label: "Prospecção Ativa",         scoreKey: "scoreLeads"     },
  { key: "process",   label: "Qualificação",             scoreKey: "scoreProcess"   },
  { key: "value",     label: "Pitch & Proposta",         scoreKey: "scoreValue"     },
  { key: "team",      label: "Negociação & Objeções",    scoreKey: "scoreTeam"      },
  { key: "kpis",      label: "Fechamento & Follow-up",   scoreKey: "scoreKpis"      },
  { key: "tools",     label: "Ferramentas",              scoreKey: "scoreTools"     },
  { key: "retention", label: "Desenvolvimento Contínuo", scoreKey: "scoreRetention" },
];

const CLASS_STYLE: Record<Classification, { card: string; text: string; badge: string; bar: string; label: string }> = {
  CRITICO: { card: "border-red-100 bg-red-50/50",         text: "text-red-800/90",     badge: "bg-red-50 text-red-700 border-red-200",             bar: "bg-red-500",     label: "Crítico" },
  ATENCAO: { card: "border-amber-100 bg-amber-50/50",     text: "text-amber-900/80",   badge: "bg-amber-50 text-amber-700 border-amber-200",       bar: "bg-amber-500",   label: "Atenção" },
  FORTE:   { card: "border-emerald-100 bg-emerald-50/50", text: "text-emerald-900/80", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500", label: "Forte" },
};

const PRIORITY_STYLE: Record<string, { label: string; cls: string }> = {
  ALTA:  { label: "Alta",  cls: "bg-red-50 text-red-700 border-red-200" },
  MEDIA: { label: "Média", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  BAIXA: { label: "Baixa", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

type SalesLevel = "JUNIOR" | "PLENO" | "SENIOR";

const SALES_LEVELS: Record<SalesLevel, {
  label: string; icon: LucideIcon; color: string; tile: string; bar: string;
  desc: string; nextLevel: SalesLevel | null; nextThreshold: number;
}> = {
  JUNIOR: {
    label: "Júnior", icon: Sprout, color: "text-orange-600", tile: "bg-orange-50 text-orange-600 border-orange-200", bar: "bg-orange-500",
    desc: "Você está desenvolvendo as habilidades fundamentais de vendas. O diagnóstico mostra áreas importantes para focar agora.",
    nextLevel: "PLENO", nextThreshold: 50,
  },
  PLENO: {
    label: "Pleno", icon: Flame, color: "text-blue-600", tile: "bg-blue-50 text-blue-600 border-blue-200", bar: "bg-blue-600",
    desc: "Você tem uma base sólida e já gera resultados consistentes. Com foco nas lacunas identificadas, você chegará ao nível Sênior.",
    nextLevel: "SENIOR", nextThreshold: 75,
  },
  SENIOR: {
    label: "Sênior", icon: Star, color: "text-amber-600", tile: "bg-amber-50 text-amber-600 border-amber-200", bar: "bg-amber-500",
    desc: "Você domina as principais técnicas de vendas e é referência. Mantenha a evolução e compartilhe seu conhecimento com a equipe.",
    nextLevel: null, nextThreshold: 100,
  },
};

function getSalesLevel(score: number): SalesLevel {
  if (score >= 75) return "SENIOR";
  if (score >= 50) return "PLENO";
  return "JUNIOR";
}

const OVERALL_STYLE: Record<string, { color: string; ring: string; label: string; desc: string }> = {
  CRITICO:   { color: "text-red-600",     ring: "from-red-50",     label: "Crítico",   desc: "Ação imediata necessária" },
  ATENCAO:   { color: "text-amber-600",   ring: "from-amber-50",   label: "Atenção",   desc: "Melhorias urgentes identificadas" },
  BOM:       { color: "text-blue-600",    ring: "from-blue-50",    label: "Bom",       desc: "Base sólida, oportunidades de crescimento" },
  EXCELENTE: { color: "text-emerald-600", ring: "from-emerald-50", label: "Excelente", desc: "Nível avançado de maturidade" },
};

const cartao = "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

// Link da ferramenta recomendada: direto pra ela se a pessoa tem o kit; senão, a página do kit
function hrefFerramenta(f: { produtoSlug: string; slug: string; liberado: boolean }) {
  return `/biblioteca/${f.produtoSlug}${f.liberado ? `/${f.slug}` : ""}`;
}

export default function ResultadoPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/scanner/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch(() => setError("Não foi possível carregar o diagnóstico."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-full bg-[#f4f6fb] text-slate-600 flex items-center justify-center p-6">
        <p className="inline-flex items-center gap-2"><Loader2 size={18} className="animate-spin text-blue-600" /> Carregando diagnóstico...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-full bg-[#f4f6fb] flex items-center justify-center p-6">
        <div className={`${cartao} text-center space-y-3 p-8`}>
          <p className="text-red-600">{error || "Diagnóstico não encontrado."}</p>
          <Link href="/scanner" className="text-sm font-medium text-blue-600 hover:underline">Voltar para o Diagnóstico</Link>
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

  const overall = OVERALL_STYLE[data.result?.priority ?? "ATENCAO"] ?? OVERALL_STYLE.ATENCAO;
  const result = data.result;
  const classification = result?.classification ?? {};
  const insights = result?.insights ?? {};
  const actions: Action[] = result?.actions ?? [];
  const strengths: string[] = result?.strengths ?? [];
  const weaknesses: string[] = result?.weaknesses ?? [];
  const recs = data.recomendacoes ?? [];
  const primeira = recs[0]?.ferramentas[0];

  const critCount = Object.values(classification).filter((c) => c === "CRITICO").length;
  const atCount   = Object.values(classification).filter((c) => c === "ATENCAO").length;
  const okCount   = Object.values(classification).filter((c) => c === "FORTE").length;

  const classeDa = (key: string, score: number) =>
    (classification[key] ?? (score < 40 ? "CRITICO" : score < 70 ? "ATENCAO" : "FORTE")) as Classification;

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-7">

        <Link href="/scanner" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Diagnóstico Comercial
        </Link>

        {/* Cabeçalho */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-white border border-slate-200 text-slate-600">
                {isVendedor ? "Auto-diagnóstico individual" : "Diagnóstico empresarial"}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(data.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {isVendedor ? "Meu diagnóstico de vendas" : data.companyName}
            </h1>
            <p className="text-slate-500 mt-0.5">
              {isVendedor ? `Segmento: ${data.segment}` : `${data.segment} • ${data.teamSize} pessoas na equipe`}
            </p>
          </div>
          <Link href="/scanner/novo" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700">
            <Plus size={16} /> Novo diagnóstico
          </Link>
        </div>

        {/* Score geral */}
        <section className={`${cartao} bg-gradient-to-br ${overall.ring} to-white p-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="text-center sm:pr-6 sm:border-r border-slate-200">
              <p className={`text-6xl font-extrabold tabular-nums ${overall.color}`}>{data.scoreTotal}</p>
              <p className="text-slate-500 text-sm mt-1">Score geral</p>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-2xl font-bold ${overall.color}`}>{overall.label}</span>
                <span className="text-slate-500 text-sm">— {overall.desc}</span>
              </div>
              {result?.summary && <p className="text-slate-700 text-sm leading-relaxed">{result.summary}</p>}
              <div className="flex gap-2 pt-1 flex-wrap">
                {critCount > 0 && <span className="text-xs px-2 py-0.5 rounded-lg bg-red-50 text-red-700">{critCount} crítico{critCount > 1 ? "s" : ""}</span>}
                {atCount > 0  && <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700">{atCount} em atenção</span>}
                {okCount > 0  && <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700">{okCount} forte{okCount > 1 ? "s" : ""}</span>}
              </div>
            </div>
          </div>
        </section>

        {/* Por onde começar — ferramentas da biblioteca para as áreas mais fracas */}
        {recs.length > 0 && (
          <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-violet-50 p-5 md:p-7 space-y-5">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Compass size={21} className="text-blue-600" /> Por onde começar</h2>
              <p className="text-sm text-slate-600 mt-1">
                Pelas suas notas, estas são as áreas que mais travam suas vendas hoje — e as ferramentas para usar primeiro, nesta ordem.
              </p>
            </div>

            {primeira && (
              <Link href={hrefFerramenta(primeira)} className="group flex items-center gap-4 rounded-2xl bg-blue-600 hover:bg-blue-700 p-4 text-white shadow-lg shadow-blue-600/25 transition-colors">
                <span className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0"><CentralIcone nome={primeira.icone} size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-blue-100">Primeiro passo</span>
                  <span className="block font-bold">{primeira.nome}</span>
                  {primeira.descricao && <span className="block text-sm text-blue-100/90 line-clamp-1">{primeira.descricao}</span>}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-1.5 transition-all">
                  {primeira.liberado ? "Usar agora" : "Ver kit"} <ArrowRight size={16} />
                </span>
              </Link>
            )}

            <div className="space-y-3">
              {recs.map((area, i) => (
                <div key={area.key} className={`${cartao} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <IconeArea chave={area.key} vendedor={isVendedor} />
                      <div className="min-w-0">
                        <p className="font-semibold"><span className="text-blue-600 mr-1">{i + 1}.</span>{area.label}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{area.porQue}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-lg border whitespace-nowrap ${CLASS_STYLE[area.score < 40 ? "CRITICO" : area.score < 70 ? "ATENCAO" : "FORTE"].badge}`}>
                      Nota {area.score}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {area.ferramentas.map(f => (
                      <Link key={f.slug} href={hrefFerramenta(f)}
                        className="group rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 p-3 flex flex-col transition-colors">
                        <span className="flex items-start gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><CentralIcone nome={f.icone} size={16} /></span>
                          <span className="text-sm font-medium leading-snug">{f.nome}</span>
                        </span>
                        <span className="mt-auto pt-2.5 text-xs">
                          {f.liberado
                            ? <span className="text-blue-700 font-semibold inline-flex items-center gap-1">Usar ferramenta <ArrowRight size={13} /></span>
                            : <span className="text-slate-500 inline-flex items-center gap-1.5"><Lock size={12} /> No kit {f.produtoNome}</span>}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Nível do vendedor */}
        {isVendedor && (() => {
          const levelKey = getSalesLevel(data.scoreTotal);
          const level = SALES_LEVELS[levelKey];
          const LevelIcon = level.icon;
          const prevThreshold = levelKey === "JUNIOR" ? 0 : levelKey === "PLENO" ? 50 : 75;
          const rangeSize = level.nextThreshold - prevThreshold;
          const progressInRange = data.scoreTotal - prevThreshold;
          const pct = level.nextLevel ? Math.round((progressInRange / rangeSize) * 100) : 100;

          return (
            <section className={`${cartao} p-6`}>
              <div className="flex items-start justify-between flex-wrap gap-5">
                <div className="flex items-center gap-4">
                  <span className={`w-16 h-16 rounded-2xl border ${level.tile} flex items-center justify-center flex-shrink-0`}><LevelIcon size={30} /></span>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Nível atual</p>
                    <p className={`text-2xl font-extrabold ${level.color}`}>{level.label}</p>
                    <p className="text-sm text-slate-500 mt-0.5 max-w-sm leading-snug">{level.desc}</p>
                  </div>
                </div>

                <div className="flex-shrink-0 min-w-[200px]">
                  {level.nextLevel ? (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-500">Progresso para {SALES_LEVELS[level.nextLevel].label}</span>
                        <span className={`text-sm font-bold ${level.color}`}>{pct}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${level.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Faltam <span className={`font-bold ${level.color}`}>{level.nextThreshold - data.scoreTotal} pts</span> para {SALES_LEVELS[level.nextLevel].label}
                      </p>
                    </>
                  ) : (
                    <p className="text-amber-600 font-semibold text-sm inline-flex items-center gap-1.5"><Award size={16} /> Nível máximo atingido</p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
                {(["JUNIOR", "PLENO", "SENIOR"] as SalesLevel[]).map((lk) => {
                  const l = SALES_LEVELS[lk];
                  const Icon = l.icon;
                  const isActive = lk === levelKey;
                  const isPast = (lk === "JUNIOR" && levelKey !== "JUNIOR") || (lk === "PLENO" && levelKey === "SENIOR");
                  return (
                    <div key={lk} className={`text-center p-3 rounded-xl border ${isActive ? l.tile : "border-slate-100 text-slate-400"}`}>
                      <Icon size={18} className="mx-auto" />
                      <p className={`text-xs font-bold mt-1 ${isActive ? l.color : ""}`}>{l.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{lk === "JUNIOR" ? "0–49 pts" : lk === "PLENO" ? "50–74 pts" : "75–100 pts"}</p>
                      {isPast && <p className="text-xs text-emerald-600 mt-0.5">Superado</p>}
                      {isActive && <p className={`text-xs mt-0.5 font-medium ${l.color}`}>Você está aqui</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* Radar + Barras */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <section className={`${cartao} p-5`}>
            <h2 className="font-bold mb-3">Visão geral por área</h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 11 }} />
                <Radar name="Score" dataKey="score" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#0f172a" }}
                  formatter={(v: number) => [`${v}/100`, "Score"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </section>

          <section className={`${cartao} p-5 space-y-3.5`}>
            <h2 className="font-bold mb-1">Notas por área</h2>
            {AREAS.map((a) => {
              const score = data[a.scoreKey as keyof DiagnosticData] as number;
              const s = CLASS_STYLE[classeDa(a.key, score)];
              return (
                <div key={a.key}>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="text-sm flex items-center gap-2 min-w-0"><IconeArea chave={a.key} vendedor={isVendedor} tamanho="sm" /> <span className="truncate">{a.label}</span></span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-sm tabular-nums">{score}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-lg border ${s.badge}`}>{s.label}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* Análise detalhada por área */}
        <section>
          <h2 className="text-xl font-bold mb-3">Análise detalhada por área</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AREAS.map((a) => {
              const score = data[a.scoreKey as keyof DiagnosticData] as number;
              const s = CLASS_STYLE[classeDa(a.key, score)];
              const insight = insights[a.key] ?? "";
              return (
                <div key={a.key} className={`rounded-2xl border p-4 space-y-2 ${s.card}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold flex items-center gap-2.5"><IconeArea chave={a.key} vendedor={isVendedor} tamanho="sm" /> {a.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-lg border ${s.badge}`}>{s.label}</span>
                  </div>
                  {insight && <p className={`text-sm leading-relaxed ${s.text}`}>{insight}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Pontos fortes e fracos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <section className={`${cartao} p-5 space-y-3`}>
            <h2 className="font-bold flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={19} /> {isVendedor ? "Suas competências fortes" : "Pontos fortes"}
            </h2>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700"><span className="text-emerald-500 flex-shrink-0">•</span>{s}</li>
              ))}
            </ul>
          </section>
          <section className={`${cartao} p-5 space-y-3`}>
            <h2 className="font-bold flex items-center gap-2 text-red-700">
              <AlertTriangle size={19} /> {isVendedor ? "Onde você está perdendo vendas" : "Principais fraquezas"}
            </h2>
            <ul className="space-y-2">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700"><span className="text-red-500 flex-shrink-0">•</span>{w}</li>
              ))}
            </ul>
          </section>
        </div>

        {/* Plano de ação / Plano de desenvolvimento */}
        <section>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <Flag size={20} className="text-blue-600" /> {isVendedor ? "Plano de desenvolvimento" : "Plano de ação"}
          </h2>
          <div className="space-y-3">
            {actions.map((action, i) => {
              const p = PRIORITY_STYLE[action.priority] ?? PRIORITY_STYLE.MEDIA;
              return (
                <div key={i} className={`${cartao} p-5 space-y-2`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div>
                        <p className="font-semibold">{action.title}</p>
                        <p className="text-xs text-slate-500">{action.area} • {action.timeframe}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium whitespace-nowrap ${p.cls}`}>Prioridade {p.label.toLowerCase()}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed pl-11">{action.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Plano de evolução (missões, simulação, objeções) — só com o menu de treinamento ligado */}
        {MENU_TREINAMENTO_VISIVEL && (
          <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50 p-6 text-center space-y-4">
            <Rocket size={30} className="mx-auto text-blue-600" />
            <p className="font-bold text-xl">Seu plano de evolução foi gerado!</p>
            <p className="text-slate-600 text-sm">
              Com base nos pontos críticos identificados, criamos missões personalizadas para corrigir cada problema.
              Conclua as missões, ganhe XP e acompanhe sua evolução.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/missoes" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm text-white">Ver plano de evolução</Link>
              <Link href="/simulacao" className="px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl font-semibold text-sm text-slate-700">Simulação gamificada</Link>
              <Link href="/objecoes" className="px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl font-semibold text-sm text-slate-700">Treinar objeções</Link>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
