"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AREA_QUESTIONS } from "@/lib/missao-questions";
import { downloadPlano90PDF } from "@/lib/pdf-plano";

type MissaoCondition = {
  type: string; area: string; priority: "CRITICO" | "ATENCAO";
  diagnosticId: string; diagnosticType: "EMPRESA" | "VENDEDOR";
  link: string; linkLabel: string; score: number;
};

type Missao = {
  id: string; title: string; description: string; xpReward: number;
  condition: MissaoCondition; progress: number; completed: boolean; completedAt: string | null;
  solutionText: string | null;
};

type PlanActionItem = {
  id: string; area: string; phase: number; text: string; impact: number;
  completed: boolean; order: number;
};

type DiagnosticScores = { scoreTotal: number } & Record<string, number>;

const PHASE_LABELS: Record<number, string> = {
  1: "Dias 1–30",
  2: "Dias 31–60",
  3: "Dias 61–90",
};

const PRIORITY_CONFIG = {
  CRITICO: { border: "border-red-800", bg: "bg-red-950/20", badge: "bg-red-900/50 text-red-300 border-red-700", bar: "bg-red-500", barBg: "bg-red-900/30", label: "🔴 Crítico" },
  ATENCAO: { border: "border-yellow-800", bg: "bg-yellow-950/20", badge: "bg-yellow-900/50 text-yellow-300 border-yellow-700", bar: "bg-yellow-500", barBg: "bg-yellow-900/30", label: "🟡 Atenção" },
};

const XP_PER_QUESTION = 15;

function renderInline(text: string): React.ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-white">{part}</strong>
      : part
  );
}

function PlanDoc({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  const bullets: string[] = [];

  function flushBullets(key: string) {
    if (bullets.length === 0) return;
    elements.push(
      <ul key={key} className="space-y-2 mb-4">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-gray-300 leading-snug">
            <span className="text-blue-400 mt-0.5 flex-shrink-0 text-xs">▸</span>
            <span>{renderInline(b)}</span>
          </li>
        ))}
      </ul>
    );
    bullets.length = 0;
  }

  lines.forEach((raw, i) => {
    const line = raw.trim();

    if (!line) {
      flushBullets(`b${i}`);
      return;
    }

    // Cabeçalho: **texto** ou **texto**: sozinho na linha
    const h = line.match(/^\*\*(.+?)\*?\*?:?$/);
    if (h && !line.includes(" **") && line.startsWith("**")) {
      flushBullets(`b${i}`);
      const title = h[1].replace(/\*+$/, "").replace(/:$/, "");
      elements.push(
        <h3 key={i} className="font-bold text-sm text-white uppercase tracking-wide mt-5 mb-2 first:mt-0 pb-1.5 border-b border-gray-700/60">
          {title}
        </h3>
      );
      return;
    }

    // Bullet: - ou •
    if (/^[-•]\s/.test(line)) {
      bullets.push(line.replace(/^[-•]\s*/, ""));
      return;
    }

    // Linha "Ação:", "Resultado esperado:" etc → label + valor
    const labelMatch = line.match(/^([^:]{3,30}):\s+(.+)$/);
    if (labelMatch && !line.startsWith("**")) {
      flushBullets(`b${i}`);
      elements.push(
        <div key={i} className="flex gap-2 text-sm mb-1.5">
          <span className="text-gray-500 flex-shrink-0 min-w-[80px]">{labelMatch[1]}:</span>
          <span className="text-gray-200">{renderInline(labelMatch[2])}</span>
        </div>
      );
      return;
    }

    // Parágrafo normal
    flushBullets(`b${i}`);
    elements.push(
      <p key={i} className="text-sm text-gray-300 leading-relaxed mb-2">
        {renderInline(line)}
      </p>
    );
  });

  flushBullets("end");
  return <div>{elements}</div>;
}

function MissaoConcluida({
  missao,
  areaName,
  planText,
}: {
  missao: Missao;
  areaName: string;
  planText: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/30 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/30 transition-colors"
        onClick={() => planText && setOpen((v) => !v)}
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/60 border border-green-800 flex items-center justify-center text-green-400 text-xs font-bold">✓</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-400 line-through decoration-gray-600">{missao.title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{areaName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-600 font-semibold">+{missao.xpReward} XP</span>
          {planText && (
            <span className="text-xs text-gray-500">{open ? "▲" : "▼"}</span>
          )}
        </div>
      </button>

      {open && planText && (
        <div className="px-5 pb-5 pt-1">
          <div className="border-t border-gray-800 pt-4">
            <PlanDoc text={planText} />
          </div>
        </div>
      )}
    </div>
  );
}

function MissaoCard({
  missao,
  areaLabels,
  onComplete,
}: {
  missao: Missao;
  areaLabels: Record<string, string>;
  onComplete: (id: string, xp: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "quiz" | "generating" | "solution" | "done">("idle");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentText, setCurrentText] = useState("");
  const [solution, setSolution] = useState("");
  const [xpEarned, setXpEarned] = useState(0);
  const [xpPulse, setXpPulse] = useState(false);
  const [apiXpGained, setApiXpGained] = useState(0);

  const cfg = PRIORITY_CONFIG[missao.condition.priority] ?? PRIORITY_CONFIG.ATENCAO;
  const areaName = areaLabels[missao.condition.area] ?? missao.condition.area;
  const areaConfig = AREA_QUESTIONS[missao.condition.area];
  const questions = areaConfig?.questions ?? [];
  const q = questions[currentQ];
  const totalQ = questions.length;
  const quizPct = Math.round(((currentQ) / totalQ) * 100);

  function pulseXP(amount: number) {
    setXpEarned((prev) => prev + amount);
    setXpPulse(true);
    setTimeout(() => setXpPulse(false), 600);
  }

  function answerQuestion(value: string) {
    if (!value.trim()) return;
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);
    setCurrentText("");
    pulseXP(XP_PER_QUESTION);

    if (currentQ + 1 < totalQ) {
      setCurrentQ((prev) => prev + 1);
    } else {
      generateSolution(newAnswers);
    }
  }

  async function generateSolution(finalAnswers: Record<string, string>) {
    setPhase("generating");
    try {
      const res = await fetch(`/api/missoes/${missao.id}/solucao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const data = await res.json();
      setSolution(data.solution ?? "");
      setApiXpGained(data.xpGained ?? missao.xpReward);
      setPhase("solution");
    } catch {
      setPhase("quiz");
    }
  }

  function confirmSolution(xpGained: number) {
    setPhase("done");
    onComplete(missao.id, xpGained);
  }

  // Missão concluída — mostra card colapsável com o plano
  if (missao.completed || phase === "done") {
    const planText = phase === "done" ? solution : missao.solutionText;
    return <MissaoConcluida missao={missao} areaName={areaName} planText={planText} />;
  }

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      {/* Cabeçalho sempre visível */}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badge}`}>{cfg.label}</span>
              <span className="text-xs text-gray-500">{areaName}</span>
            </div>
            <h3 className="font-bold text-base">{missao.title}</h3>
            {phase === "idle" && <p className="text-sm text-gray-400 leading-relaxed">{missao.description}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-base font-black transition-all ${xpPulse ? "text-yellow-300 scale-125" : "text-yellow-400"}`}>
              {phase === "idle" ? `+${missao.xpReward} XP` : `+${xpEarned} XP`}
            </p>
            {phase !== "idle" && <p className="text-xs text-gray-500">de {missao.xpReward} XP</p>}
          </div>
        </div>

        {/* Barra de score */}
        {phase === "idle" && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Score atual: {areaName}</span>
              <span className={missao.condition.score < 40 ? "text-red-400 font-semibold" : "text-yellow-400 font-semibold"}>{missao.condition.score}/100</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${cfg.barBg}`}>
              <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${missao.condition.score}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* FASE IDLE — botão iniciar */}
      {phase === "idle" && (
        <div className="px-5 pb-5">
          {areaConfig && (
            <p className="text-xs text-gray-500 mb-3 italic">{areaConfig.intro}</p>
          )}
          <button
            onClick={() => setPhase("quiz")}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            🚀 Iniciar desafio — {totalQ} perguntas • +{missao.xpReward} XP
          </button>
        </div>
      )}

      {/* FASE QUIZ */}
      {phase === "quiz" && q && (
        <div className="border-t border-gray-800 px-5 pb-5 pt-4 space-y-4">
          {/* Progresso do quiz */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-medium">Pergunta {currentQ + 1} de {totalQ}</span>
              <span className="text-yellow-400 font-bold">+{XP_PER_QUESTION} XP por resposta</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${quizPct}%` }}
              />
            </div>
          </div>

          {/* Indicadores de progresso */}
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${i < currentQ ? "bg-green-500" : i === currentQ ? "bg-blue-500" : "bg-gray-700"}`}
              />
            ))}
          </div>

          {/* Pergunta */}
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <p className="font-semibold text-sm leading-relaxed">{q.text}</p>

            {q.type === "select" && q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => answerQuestion(opt)}
                    className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-blue-900/40 border border-gray-700 hover:border-blue-600 rounded-xl text-sm transition-all"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === "text" && (
              <div className="space-y-2">
                <textarea
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) answerQuestion(currentText); }}
                  placeholder={q.placeholder}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Ctrl+Enter para avançar</span>
                  <button
                    onClick={() => answerQuestion(currentText)}
                    disabled={!currentText.trim()}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-sm font-bold transition-colors"
                  >
                    Responder → +{XP_PER_QUESTION} XP
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Respostas anteriores */}
          {currentQ > 0 && (
            <div className="space-y-1">
              {questions.slice(0, currentQ).map((prevQ) => (
                <div key={prevQ.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-green-500">✓</span>
                  <span className="truncate">{answers[prevQ.id]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FASE GERANDO */}
      {phase === "generating" && (
        <div className="border-t border-gray-800 px-5 py-10 text-center space-y-4">
          <div className="text-4xl animate-pulse">🤖</div>
          <p className="font-bold text-base">Gerando seu plano personalizado...</p>
          <p className="text-sm text-gray-400">A IA está analisando suas respostas e criando {areaConfig?.solutionLabel ?? "a solução"} para o seu negócio.</p>
          <div className="flex gap-1.5 justify-center pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <p className="text-sm font-bold text-yellow-400">+{xpEarned} XP acumulados</p>
        </div>
      )}

      {/* FASE SOLUÇÃO */}
      {phase === "solution" && (
        <div className="border-t border-gray-800">
          {/* Header do plano */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-base">{areaConfig?.solutionLabel ?? "Seu plano"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Revise e confirme para receber +{missao.xpReward} XP</p>
            </div>
            <span className="text-2xl">📄</span>
          </div>

          {/* Conteúdo do plano */}
          <div className="mx-5 mb-4 max-h-[440px] overflow-y-auto pr-1">
            <PlanDoc text={solution} />
          </div>

          {/* Ações */}
          <div className="px-5 pb-5 space-y-2 border-t border-gray-800 pt-4">
            <button
              onClick={() => confirmSolution(apiXpGained)}
              className="w-full py-3.5 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 rounded-xl font-bold text-sm transition-all"
            >
              Confirmar e receber +{missao.xpReward} XP
            </button>
            <button
              onClick={() => { setPhase("quiz"); setCurrentQ(0); setAnswers({}); setXpEarned(0); }}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Refazer as perguntas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanChecklist({
  actions: initialActions,
  areaLabels,
  initialScores,
}: {
  actions: PlanActionItem[];
  areaLabels: Record<string, string>;
  initialScores: DiagnosticScores;
}) {
  const router = useRouter();
  const [actions, setActions] = useState(initialActions);
  const [scores, setScores] = useState(initialScores);
  const [pulseArea, setPulseArea] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const total = actions.length;
  const done = actions.filter((a) => a.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const phases = [1, 2, 3].filter((p) => actions.some((a) => a.phase === p));

  async function toggle(action: PlanActionItem) {
    if (pendingId) return;
    const nextCompleted = !action.completed;
    setPendingId(action.id);
    setActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, completed: nextCompleted } : a)));

    try {
      const res = await fetch(`/api/missoes/plano-90-dias/acoes/${action.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setScores((prev) => ({ ...prev, [action.area]: data.areaScore, scoreTotal: data.scoreTotal }));
      setPulseArea(action.area);
      setTimeout(() => setPulseArea(null), 800);
      router.refresh();
    } catch {
      setActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, completed: action.completed } : a)));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="border-t border-purple-900/30">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-bold text-sm">✅ Checklist de execução</p>
          <p className="text-xs text-gray-500 mt-0.5">Marque o que você já executou de fato — o score do diagnóstico é atualizado automaticamente.</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-500">Score geral</p>
          <p className="text-lg font-black text-purple-300">{scores.scoreTotal}/100</p>
        </div>
      </div>

      <div className="px-5 pb-3">
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1">{done}/{total} ações executadas</p>
      </div>

      <div className="px-5 pb-5 space-y-5">
        {phases.map((phase) => (
          <div key={phase} className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{PHASE_LABELS[phase] ?? `Fase ${phase}`}</p>
            <div className="space-y-1.5">
              {actions.filter((a) => a.phase === phase).map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggle(a)}
                  disabled={pendingId === a.id}
                  className={`w-full flex items-start gap-3 text-left px-3 py-2.5 rounded-xl border transition-colors ${
                    a.completed ? "bg-green-950/20 border-green-800/50" : "bg-gray-900/50 border-gray-800 hover:border-gray-700"
                  } ${pendingId === a.id ? "opacity-60" : ""}`}
                >
                  <span
                    className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center text-xs mt-0.5 ${
                      a.completed ? "bg-green-600 border-green-500 text-white" : "border-gray-600 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="flex-1">
                    <span className={`text-sm ${a.completed ? "text-gray-500 line-through decoration-gray-700" : "text-gray-200"}`}>{a.text}</span>
                    <span className="block text-[11px] text-gray-600 mt-0.5">
                      {areaLabels[a.area] ?? a.area}
                      {pulseArea === a.area && <span className="ml-1.5 text-green-400 font-semibold">+score</span>}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NinetyDayPlanSection({
  diagnosticId,
  initialPlan,
  initialActions,
  onGenerated,
  companyName,
  segment,
  areaLabels,
  diagnosticScores,
}: {
  diagnosticId: string | null;
  initialPlan: string | null;
  initialActions: PlanActionItem[];
  onGenerated: (xp: number) => void;
  companyName: string;
  segment: string | null;
  areaLabels: Record<string, string>;
  diagnosticScores: DiagnosticScores | null;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [actions, setActions] = useState(initialActions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function gerar() {
    if (!diagnosticId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/missoes/plano-90-dias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosticId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível gerar o plano agora.");
        return;
      }
      setPlan(data.content);
      setActions(data.actions ?? []);
      if (data.xpGained > 0) onGenerated(data.xpGained);
    } catch {
      setError("Não foi possível gerar o plano agora.");
    } finally {
      setLoading(false);
    }
  }

  if (plan) {
    return (
      <div className="rounded-2xl border border-purple-800/50 bg-purple-950/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-900/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <p className="font-bold text-base">Seu plano dos próximos 90 dias</p>
              <p className="text-xs text-gray-400">Roteiro completo para mudar o cenário comercial da empresa</p>
            </div>
          </div>
          <button
            onClick={() => downloadPlano90PDF(plan, { companyName, segment })}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-semibold transition-colors"
          >
            ⬇️ PDF
          </button>
        </div>
        <div className="px-5 py-4 max-h-[600px] overflow-y-auto">
          <PlanDoc text={plan} />
        </div>
        {actions.length > 0 && diagnosticScores && (
          <PlanChecklist actions={actions} areaLabels={areaLabels} initialScores={diagnosticScores} />
        )}
        <div className="px-5 pb-5 pt-3">
          <Link href="/scanner/novo" className="block text-center text-xs text-blue-400 hover:text-blue-300 transition-colors">
            Refazer diagnóstico para medir o progresso →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-10 px-6 space-y-4 bg-green-950/20 border border-green-800 rounded-2xl">
      <div className="text-5xl">🏆</div>
      <h2 className="text-xl font-bold text-green-300">Todos os desafios concluídos!</h2>
      <p className="text-gray-400 text-sm max-w-md mx-auto">
        Agora vamos juntar tudo que você construiu e montar um plano de 90 dias para mudar o cenário comercial da empresa.
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={gerar}
        disabled={loading || !diagnosticId}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 rounded-xl font-bold text-sm transition-all"
      >
        {loading ? "🤖 Gerando plano de 90 dias..." : "🗺️ Gerar plano de 90 dias"}
      </button>
    </div>
  );
}

export function MissoesClient({
  missoes: initialMissoes,
  areaLabels,
  diagnosticId,
  ninetyDayPlan,
  planActions,
  diagnosticScores,
  companyName,
  segment,
}: {
  missoes: Missao[];
  areaLabels: Record<string, string>;
  diagnosticId: string | null;
  ninetyDayPlan: string | null;
  planActions: PlanActionItem[];
  diagnosticScores: DiagnosticScores | null;
  companyName: string;
  segment: string | null;
}) {
  const router = useRouter();
  const [missoes, setMissoes] = useState(initialMissoes);
  const [toast, setToast] = useState<number | null>(null);

  const ativas = missoes.filter((m) => !m.completed);
  const concluidas = missoes.filter((m) => m.completed);
  const pct = missoes.length > 0 ? Math.round((concluidas.length / missoes.length) * 100) : 0;
  const xpTotal = missoes.reduce((a, m) => a + m.xpReward, 0);
  const xpConcluido = concluidas.reduce((a, m) => a + m.xpReward, 0);

  function handleComplete(id: string, xp: number) {
    setMissoes((prev) => prev.map((m) => (m.id === id ? { ...m, completed: true } : m)));
    setToast(xp);
    setTimeout(() => { setToast(null); router.refresh(); }, 4000);
  }

  function handlePlanGenerated(xp: number) {
    setToast(xp);
    setTimeout(() => setToast(null), 4000);
  }

  if (missoes.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-6xl">📊</div>
        <h2 className="text-xl font-bold">Nenhum diagnóstico encontrado</h2>
        <p className="text-gray-400 text-sm">Faça o diagnóstico no Scanner para gerar seus desafios personalizados.</p>
        <Link href="/scanner/novo" className="inline-block mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors">
          Fazer diagnóstico agora →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast !== null && (
        <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-green-600 to-blue-600 text-white px-5 py-4 rounded-2xl shadow-2xl font-bold">
          🎉 Desafio concluído! +{toast} XP ganhos!
        </div>
      )}

      {/* Progresso geral */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Progresso do plano de ação</p>
            <p className="text-xs text-gray-400 mt-0.5">{concluidas.length}/{missoes.length} desafios • {xpConcluido}/{xpTotal} XP</p>
          </div>
          <span className="text-2xl font-black text-blue-400">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-5 text-xs">
          {ativas.filter(m => m.condition.priority === "CRITICO").length > 0 && <span className="text-red-400">🔴 {ativas.filter(m => m.condition.priority === "CRITICO").length} crítico(s)</span>}
          {ativas.filter(m => m.condition.priority === "ATENCAO").length > 0 && <span className="text-yellow-400">🟡 {ativas.filter(m => m.condition.priority === "ATENCAO").length} em atenção</span>}
          {concluidas.length > 0 && <span className="text-green-400">🟢 {concluidas.length} concluído(s)</span>}
        </div>
      </div>

      {/* Críticos */}
      {ativas.filter(m => m.condition.priority === "CRITICO").length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-red-400">🔴 Desafios críticos — resolver primeiro</h2>
          {ativas.filter(m => m.condition.priority === "CRITICO").map(m => (
            <MissaoCard key={m.id} missao={m} areaLabels={areaLabels} onComplete={handleComplete} />
          ))}
        </div>
      )}

      {/* Atenção */}
      {ativas.filter(m => m.condition.priority === "ATENCAO").length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-yellow-400">🟡 Pontos de melhoria</h2>
          {ativas.filter(m => m.condition.priority === "ATENCAO").map(m => (
            <MissaoCard key={m.id} missao={m} areaLabels={areaLabels} onComplete={handleComplete} />
          ))}
        </div>
      )}

      {/* Concluídas */}
      {concluidas.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Concluídos</h2>
          {concluidas.map(m => (
            <MissaoCard key={m.id} missao={m} areaLabels={areaLabels} onComplete={handleComplete} />
          ))}
        </div>
      )}

      {ativas.length === 0 && missoes.length > 0 && (
        <NinetyDayPlanSection
          diagnosticId={diagnosticId}
          initialPlan={ninetyDayPlan}
          initialActions={planActions}
          onGenerated={handlePlanGenerated}
          companyName={companyName}
          segment={segment}
          areaLabels={areaLabels}
          diagnosticScores={diagnosticScores}
        />
      )}
    </div>
  );
}
