"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ARIA, CEO, Rival, SpeechBubble, FloatingWrapper } from "./characters";

type Option = { id: string; label: string; hint: string };
type Category = { key: string; label: string; icon: string; options: Option[] };
type ScenarioData = { scenario: string; challenge: string; categories: Category[] };
type CompanyData = { name: string; segment: string; currentMRR: number; currentMonth: number };
type Mode = "GESTOR" | "VENDEDOR";
type Result = {
  mrrBefore: number; mrrAfter: number; mrrChangePercent: number; xpGained: number;
  summary: string; feedback: Record<string, string>; categoryImpacts: Record<string, number>;
  mode?: Mode;
};
type Phase = "loading" | "playing" | "submitting" | "result" | "error";

// Cores para categorias de GESTOR
const CAT_COLORS_GESTOR: Record<string, { bg: string; border: string; glow: string; text: string; badge: string }> = {
  prospeccao: { bg: "from-blue-950/60 to-blue-900/30",     border: "border-blue-700",    glow: "shadow-blue-500/20",    text: "text-blue-300",    badge: "bg-blue-900/60 text-blue-300" },
  processo:   { bg: "from-purple-950/60 to-purple-900/30", border: "border-purple-700",  glow: "shadow-purple-500/20",  text: "text-purple-300",  badge: "bg-purple-900/60 text-purple-300" },
  equipe:     { bg: "from-orange-950/60 to-orange-900/30", border: "border-orange-700",  glow: "shadow-orange-500/20",  text: "text-orange-300",  badge: "bg-orange-900/60 text-orange-300" },
  estrategia: { bg: "from-emerald-950/60 to-emerald-900/30",border:"border-emerald-700", glow: "shadow-emerald-500/20", text: "text-emerald-300", badge: "bg-emerald-900/60 text-emerald-300" },
};

// Cores para categorias de VENDEDOR
const CAT_COLORS_VENDEDOR: Record<string, { bg: string; border: string; glow: string; text: string; badge: string }> = {
  abordagem:    { bg: "from-blue-950/60 to-blue-900/30",     border: "border-blue-700",    glow: "shadow-blue-500/20",    text: "text-blue-300",    badge: "bg-blue-900/60 text-blue-300" },
  qualificacao: { bg: "from-violet-950/60 to-violet-900/30", border: "border-violet-700",  glow: "shadow-violet-500/20",  text: "text-violet-300",  badge: "bg-violet-900/60 text-violet-300" },
  proposta:     { bg: "from-amber-950/60 to-amber-900/30",   border: "border-amber-700",   glow: "shadow-amber-500/20",   text: "text-amber-300",   badge: "bg-amber-900/60 text-amber-300" },
  fechamento:   { bg: "from-emerald-950/60 to-emerald-900/30",border:"border-emerald-700", glow: "shadow-emerald-500/20", text: "text-emerald-300", badge: "bg-emerald-900/60 text-emerald-300" },
};

const RISK_LABELS = ["Conservador", "Moderado", "Agressivo"];
const RISK_COLORS = ["text-green-400", "text-yellow-400", "text-red-400"];

function fmtMRR(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const end = value; const startTime = performance.now();
    function tick(now: number) {
      const t = Math.min((now - startTime) / 1400, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(end * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{prefix}{display.toLocaleString("pt-BR")}{suffix}</>;
}

export default function JogarPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [mode, setMode] = useState<Mode>("GESTOR");
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [ariaSpeech, setAriaSpeech] = useState("");

  const isVendedor = mode === "VENDEDOR";
  const CAT_COLORS = isVendedor ? CAT_COLORS_VENDEDOR : CAT_COLORS_GESTOR;
  const roundLabel = isVendedor ? "Rodada" : "Mês";

  function loadRound() {
    setPhase("loading");
    fetch("/api/simulacao/rodada")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setPhase("error"); return; }
        setCompany(d.company);
        setScenario(d.scenario);
        setMode(d.mode ?? "GESTOR");
        setAriaSpeech(d.scenario?.challenge ?? "Analise o cenário e tome suas decisões.");
        setPhase("playing");
      })
      .catch(() => { setError("Erro ao carregar cenário."); setPhase("error"); });
  }

  useEffect(() => { loadRound(); }, []);

  async function handleSubmit() {
    if (!scenario || !scenario.categories.every(c => decisions[c.key])) return;
    setPhase("submitting");
    try {
      const res = await fetch("/api/simulacao/rodada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions, scenario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setResult(data);
      setPhase("result");
    } catch {
      setError("Erro ao processar rodada."); setPhase("error");
    }
  }

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <FloatingWrapper>
            <ARIA mood="thinking" size={120} />
          </FloatingWrapper>
          <div>
            <p className="text-white font-bold text-lg">Gerando cenário com IA</p>
            <p className="text-gray-500 text-sm mt-1">ARIA está preparando a situação...</p>
          </div>
          <div className="flex gap-1.5 justify-center">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <CEO mood="sad" size={120} />
          <p className="text-red-400 text-sm">{error}</p>
          <Link href="/simulacao" className="inline-block px-6 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition-colors">← Voltar</Link>
        </div>
      </div>
    );
  }

  // ── SUBMITTING ───────────────────────────────────────────────────────────
  if (phase === "submitting") {
    const submittingLines = isVendedor
      ? ["Avaliando sua abordagem...", "Analisando qualificação...", "Verificando proposta de valor...", "Calculando resultado do fechamento..."]
      : ["Avaliando prospecção...", "Simulando processo de vendas...", "Calculando dinâmica da equipe...", "Analisando impacto estratégico..."];

    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-8 max-w-sm px-6">
          <div className="relative">
            <FloatingWrapper>
              <ARIA mood="speaking" size={110} />
            </FloatingWrapper>
            <div className="absolute -top-2 -right-4">
              <SpeechBubble text={isVendedor ? "Analisando suas decisões de venda..." : "Processando suas decisões... aguarde."} />
            </div>
          </div>
          <div className="space-y-3">
            {submittingLines.map((t, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse flex-shrink-0" style={{ animationDelay: `${i * 0.25}s` }} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────
  if (phase === "result" && result && scenario) {
    const positive = result.mrrChangePercent >= 0;
    const ceoMood = result.mrrChangePercent > 10 ? "excited" : positive ? "happy" : "sad";
    const roundNum = (company?.currentMonth ?? 2) - 1;

    return (
      <div className="min-h-screen bg-gray-950 text-white pb-16">

        <div className={`relative overflow-hidden ${positive ? "bg-gradient-to-b from-green-950/70 via-gray-950/80 to-gray-950" : "bg-gradient-to-b from-red-950/70 via-gray-950/80 to-gray-950"} px-6 pt-8 pb-6`}>
          <div className={`absolute inset-0 opacity-20`}
            style={{ background: `radial-gradient(ellipse at 50% 20%, ${positive ? "#22c55e" : "#ef4444"} 0%, transparent 60%)` }} />

          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-end justify-center gap-6 mb-6">
              <div className="flex flex-col items-center gap-2">
                <SpeechBubble
                  text={isVendedor
                    ? (positive ? "Ótima atuação! Continue evoluindo." : "Hora de rever sua abordagem.")
                    : (positive ? "Excelente estratégia! Os números falam por si." : "Decisões difíceis. Aprenda com este mês.")}
                  from="left"
                />
                <FloatingWrapper delay={0.3}>
                  <ARIA mood={positive ? "speaking" : "alert"} size={90} />
                </FloatingWrapper>
                <p className="text-xs text-purple-400 font-medium">ARIA</p>
              </div>

              <div className="text-center space-y-1 pb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  {isVendedor ? `Resultado da Rodada ${roundNum}` : `Resultado do Mês ${roundNum}`}
                </p>
                <p className={`text-6xl font-black ${positive ? "text-green-400" : "text-red-400"}`}>
                  {positive ? "+" : ""}<AnimatedCounter value={Math.round(result.mrrChangePercent * 10) / 10} suffix="%" />
                </p>
                {isVendedor ? (
                  <p className="text-gray-400 text-sm">
                    Score: {Math.round(result.mrrBefore)} → <span className={`font-bold ${positive ? "text-green-400" : "text-red-400"}`}>{Math.round(result.mrrAfter)} pts</span>
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">
                    {fmtMRR(result.mrrBefore)} → <span className={`font-bold ${positive ? "text-green-400" : "text-red-400"}`}>{fmtMRR(result.mrrAfter)}</span>
                  </p>
                )}
                <div className="inline-flex items-center gap-1.5 bg-yellow-900/40 border border-yellow-600/50 rounded-full px-4 py-1 mt-1">
                  <span>⭐</span>
                  <span className="text-yellow-300 font-bold text-sm">+<AnimatedCounter value={result.xpGained} /> XP</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <FloatingWrapper delay={0.6}>
                  <CEO mood={ceoMood} size={110} />
                </FloatingWrapper>
                <p className="text-xs text-blue-400 font-medium">Você</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 space-y-5 mt-2">

          <div className="flex gap-3 items-start">
            <div className="flex-shrink-0 mt-1">
              <ARIA mood="speaking" size={48} />
            </div>
            <div className="bg-purple-950/40 border border-purple-800/50 rounded-2xl rounded-tl-sm p-4 flex-1">
              <p className="text-xs font-semibold text-purple-400 mb-1">
                {isVendedor ? "ARIA — Feedback da Situação" : "ARIA — Análise do Mês"}
              </p>
              <p className="text-gray-200 text-sm leading-relaxed">{result.summary}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Avaliação por área</p>
            <div className="space-y-3">
              {scenario.categories.map((cat) => {
                const impact = result.categoryImpacts?.[cat.key] ?? 0;
                const col = CAT_COLORS[cat.key] ?? CAT_COLORS_GESTOR.prospeccao;
                const chosen = cat.options.find(o => o.id === decisions[cat.key]);
                return (
                  <div key={cat.key} className={`rounded-2xl border bg-gradient-to-br ${col.bg} ${col.border} p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`flex items-center gap-2 font-semibold text-sm ${col.text}`}>{cat.icon} {cat.label}</span>
                      <span className={`text-sm font-bold ${impact >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {impact >= 0 ? "+" : ""}{impact.toFixed(1)}%
                      </span>
                    </div>
                    <p className={`text-xs font-medium px-3 py-1.5 rounded-lg mb-2 inline-block ${col.badge}`}>
                      ✓ {chosen?.label}
                    </p>
                    <p className="text-xs text-gray-300 leading-relaxed">{result.feedback[cat.key]}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link href="/simulacao" className="py-3.5 border border-gray-700 hover:border-gray-500 rounded-xl text-center text-sm font-medium transition-colors">
              📊 {isVendedor ? "Histórico" : "Dashboard"}
            </Link>
            <button onClick={() => { setDecisions({}); setResult(null); loadRound(); }}
              className="py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-sm font-bold transition-all">
              ▶ {roundLabel} {company?.currentMonth ?? 2}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ──────────────────────────────────────────────────────────────
  if (!company || !scenario) return null;
  const answeredCount = scenario.categories.filter(c => decisions[c.key]).length;
  const allAnswered = answeredCount === scenario.categories.length;
  const ceoMood = answeredCount === 0 ? "neutral" : answeredCount < scenario.categories.length ? "thinking" : "happy";

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* HUD */}
      <div className="sticky top-0 z-20 bg-gray-950/96 backdrop-blur border-b border-gray-800/80">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-900/60 border border-blue-700 flex items-center justify-center">
            <span className="text-blue-400 font-bold text-sm">{company.currentMonth}</span>
          </div>
          <div className="flex-1 flex gap-0.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < company.currentMonth - 1 ? "bg-green-500" : i === company.currentMonth - 1 ? "bg-blue-500 animate-pulse" : "bg-gray-800"}`} />
            ))}
          </div>
          <span className="text-sm font-bold text-blue-400 whitespace-nowrap">
            {isVendedor ? `${Math.round(company.currentMRR)} pts` : fmtMRR(company.currentMRR)}
          </span>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-2 flex gap-2">
          {scenario.categories.map(cat => {
            const done = !!decisions[cat.key];
            const col = CAT_COLORS[cat.key] ?? CAT_COLORS_GESTOR.prospeccao;
            return (
              <button key={cat.key}
                onClick={() => document.getElementById(`cat-${cat.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${done ? `${col.border} ${col.badge}` : "border-gray-700 text-gray-500"}`}>
                {cat.icon} {done ? "✓" : cat.label.split(" ")[0]}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-gray-500 self-center">{answeredCount}/{scenario.categories.length}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* PERSONAGENS + BRIEFING */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-800/50 bg-gradient-to-br from-blue-950/40 via-gray-900 to-gray-950">
          {!isVendedor && (
            <div className="absolute right-0 top-0 opacity-20 pointer-events-none">
              <Rival size={90} />
            </div>
          )}

          <div className="p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <FloatingWrapper>
                  <ARIA mood="speaking" size={72} />
                </FloatingWrapper>
                <p className="text-center text-xs text-purple-400 font-medium mt-1">ARIA</p>
              </div>
              <div className="flex-1 space-y-2 pt-1">
                <div className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-700/50 rounded-full px-3 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                    {isVendedor ? `Situação de Venda — Rodada ${company.currentMonth}` : `Briefing — Mês ${company.currentMonth}`}
                  </span>
                </div>
                <p className="text-gray-200 text-sm leading-relaxed pr-12">{scenario.scenario}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-700/50 rounded-xl p-3">
              <span className="text-xl flex-shrink-0 mt-0.5">⚡</span>
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-0.5">
                  {isVendedor ? "Desafio desta situação" : "Desafio do mês"}
                </p>
                <p className="text-sm text-amber-200">{scenario.challenge}</p>
              </div>
            </div>
          </div>
        </div>

        {/* DECISÕES */}
        <div className="space-y-4">
          {scenario.categories.map((cat) => {
            const col = CAT_COLORS[cat.key] ?? CAT_COLORS_GESTOR.prospeccao;
            const selected = decisions[cat.key];
            return (
              <div id={`cat-${cat.key}`} key={cat.key}
                className={`rounded-2xl border overflow-hidden transition-all duration-300 ${selected ? `${col.border} shadow-xl ${col.glow}` : "border-gray-800"}`}>

                <div className={`flex items-center justify-between px-5 py-4 bg-gradient-to-r ${col.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border ${col.border} bg-black/20 flex items-center justify-center text-xl`}>{cat.icon}</div>
                    <div>
                      <p className={`font-bold ${col.text}`}>{cat.label}</p>
                      <p className="text-xs text-gray-500">{selected ? `✓ ${cat.options.find(o => o.id === selected)?.label}` : "Nenhuma decisão tomada"}</p>
                    </div>
                  </div>
                  {selected && <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />}
                </div>

                <div className="bg-gray-950/90 border-t border-gray-800/60 p-3 space-y-2">
                  {cat.options.map((opt, optIdx) => {
                    const isSelected = selected === opt.id;
                    return (
                      <button key={opt.id}
                        onClick={() => setDecisions(p => ({ ...p, [cat.key]: opt.id }))}
                        className={`w-full text-left rounded-xl border p-4 transition-all duration-200 group hover:scale-[1.01] active:scale-[0.99] ${
                          isSelected ? `${col.border} bg-gradient-to-r ${col.bg} shadow-lg ${col.glow}` : "border-gray-800 bg-gray-900/60 hover:border-gray-600 hover:bg-gray-800/60"
                        }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? `${col.border} bg-gradient-to-br from-blue-500 to-purple-600` : "border-gray-600 group-hover:border-gray-400"}`}>
                              {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <div>
                              <p className={`font-semibold text-sm ${isSelected ? col.text : "text-gray-200 group-hover:text-white"}`}>{opt.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{opt.hint}</p>
                            </div>
                          </div>
                          <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800/80 ${RISK_COLORS[optIdx]}`}>
                            {RISK_LABELS[optIdx]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* CEO + BOTÃO EXECUTAR */}
        <div className="flex items-end gap-4 pt-2 pb-8">
          <div className="flex-shrink-0 flex flex-col items-center">
            <FloatingWrapper delay={0.5}>
              <CEO mood={ceoMood} size={100} />
            </FloatingWrapper>
            <p className="text-xs text-blue-400 font-medium text-center mt-1">
              {isVendedor ? "Você" : company.name}
            </p>
          </div>
          <div className="flex-1">
            {!allAnswered && (
              <p className="text-xs text-gray-500 mb-2 text-center">
                {answeredCount === 0
                  ? (isVendedor ? "Tome suas decisões para agir na situação." : "Tome suas decisões para o CEO agir.")
                  : `Faltam ${scenario.categories.length - answeredCount} decisões.`}
              </p>
            )}
            <button onClick={handleSubmit} disabled={!allAnswered}
              className={`w-full py-5 rounded-2xl font-black text-base tracking-wide transition-all duration-300 ${
                allAnswered
                  ? "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}>
              {allAnswered
                ? <span className="flex items-center justify-center gap-2">
                    ⚡ {isVendedor ? `Executar Rodada ${company.currentMonth}` : `Executar Mês ${company.currentMonth}`} ⚡
                  </span>
                : <span className="flex items-center justify-center gap-2 text-sm">
                    🔒 {answeredCount}/{scenario.categories.length} decisões tomadas
                  </span>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
