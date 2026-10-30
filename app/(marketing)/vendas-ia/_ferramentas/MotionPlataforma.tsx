"use client";

import { useState } from "react";
import { Check, ChevronRight, ClipboardPaste, Copy, Sparkles } from "lucide-react";
import { CentralIcone } from "@/lib/central-icons";
import { palavras, useRoteiro } from "./roteiro";

export type CardMotion = { rotulo: string; nome: string; icone: string; modulo: string };

// Legenda de cada cena (o que o lead precisa entender em cada passo)
const PASSOS = ["Escolha o que precisa", "Responda algumas perguntas", "Receba o prompt pronto", "Cole no ChatGPT ou no Claude"];
const MAX_TOKENS_PROMPT = 85;
const PARAR = Symbol("parar");

const mono = "font-[family-name:var(--f-mono)]";
const vidro = "border border-[var(--line)] bg-[linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.015))]";

// 1ª dobra: como funciona, em loop, na identidade da landing (ilustração, não a tela real) — escolher a ferramenta,
// preencher o formulário, preparar e copiar o prompt (o texto real montado pela plataforma) e colar
// na IA. A resposta da IA no fim é ilustrativa (a plataforma não executa IA nenhuma).
export function MotionPlataforma({ cards, alvo, ferramenta, campos, prompt, resposta }: {
  cards: CardMotion[];
  alvo: number; // índice do card que é "clicado"
  ferramenta: string;
  campos: [string, string][];
  prompt: string;
  resposta: string[];
}) {
  const tokensPrompt = palavras(prompt).slice(0, MAX_TOKENS_PROMPT);
  const tokensResp = resposta.map(palavras);
  const totalResp = tokensResp.reduce((s, t) => s + t.length, 0);
  // Antes de parar no card certo, o destaque passa por outros dois
  const percurso = [...cards.map((_, i) => i).filter(i => i !== alvo).slice(0, 2), alvo];

  const [cena, setCena] = useState(0);
  const [destaque, setDestaque] = useState(-1);
  const [clicado, setClicado] = useState(false);
  const [valores, setValores] = useState<string[]>(campos.map(() => ""));
  const [campoAtivo, setCampoAtivo] = useState(-1);
  const [botao, setBotao] = useState(false);
  const [nTok, setNTok] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [colado, setColado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [nResp, setNResp] = useState(0);

  const ref = useRoteiro<HTMLDivElement>(async ({ espera, reduzido }) => {
    if (reduzido) {
      setCena(3); setValores(campos.map(c => c[1])); setNTok(tokensPrompt.length); setCopiado(true); setColado(true); setNResp(totalResp);
      return;
    }
    const e = async (ms: number) => { if (!(await espera(ms))) throw PARAR; };
    try {
      setCena(0); setDestaque(-1); setClicado(false); setValores(campos.map(() => "")); setCampoAtivo(-1);
      setBotao(false); setNTok(0); setCopiado(false); setColado(false); setGerando(false); setNResp(0);
      await e(700);
      for (const i of percurso) { setDestaque(i); await e(480); }
      setClicado(true); await e(450);
      setCena(1); setClicado(false); await e(550);
      for (let k = 0; k < campos.length; k++) {
        setCampoAtivo(k);
        const alvoTxt = campos[k][1];
        for (let n = 2; n <= alvoTxt.length + 1; n += 2) {
          setValores(v => v.map((x, j) => (j === k ? alvoTxt.slice(0, n) : x)));
          await e(16);
        }
        await e(160);
      }
      setCampoAtivo(-1); await e(250);
      setBotao(true); await e(420);
      setCena(2); setBotao(false); await e(350);
      for (let t = 1; t <= tokensPrompt.length; t++) { setNTok(t); await e(20); }
      await e(600); setCopiado(true); await e(900);
      setCena(3); await e(500);
      setColado(true); await e(450);
      setGerando(true); await e(1500); setGerando(false);
      for (let t = 1; t <= totalResp; t++) { setNResp(t); await e(40); }
      await e(4500);
    } catch (err) {
      if (err !== PARAR) throw err;
    }
  });

  const camada = (i: number) => `absolute inset-0 p-3 sm:p-4 transition-opacity duration-500 ${cena === i ? "opacity-100" : "opacity-0 pointer-events-none"}`;
  const passoAtual = Math.min(cena, 3);
  const visiveisPorMsg = tokensResp.map((t, m) => {
    const antes = tokensResp.slice(0, m).reduce((s, x) => s + x.length, 0);
    return Math.max(0, Math.min(t.length, nResp - antes));
  });

  return (
    <div ref={ref} className="rounded-2xl border border-[var(--line-strong)] bg-white/[.03] p-2 shadow-[0_40px_120px_-30px_rgba(251,191,36,.3)]" aria-label={`Animação: a Vendas IA preparando o prompt da ferramenta ${ferramenta}`} role="img">
      <div className="rounded-xl overflow-hidden border border-[var(--line)] bg-[#0b0b0e] text-[var(--text)]">
        <div className="flex items-baseline gap-3 px-4 pt-4 pb-3 border-b border-[var(--line)]">
          <span className={`text-[11px] text-[var(--acc)] ${mono}`}>0{passoAtual + 1}</span>
          <p key={passoAtual} className="vlp-in text-lg sm:text-xl leading-tight">
            <em className="font-[family-name:var(--f-serif)] italic text-[var(--acc-bright)]">{PASSOS[passoAtual]}</em>
          </p>
        </div>

        <div className="relative h-[410px] sm:h-[370px]">
          {/* Cena 0 — escolher a ferramenta */}
          <div className={camada(0)}>
            <div className="grid grid-cols-2 gap-2">
              {cards.map((c, i) => (
                <div key={c.nome} className={`rounded-xl p-2.5 transition-all duration-300 ${i > 3 ? "hidden sm:block" : ""} ${destaque === i ? "border border-[var(--acc)] bg-[var(--acc-dim)] -translate-y-0.5 shadow-[0_10px_30px_-12px_rgba(251,191,36,.5)]" : vidro} ${destaque === i && clicado ? "scale-[.97]" : ""}`}>
                  <div className="flex items-start gap-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${destaque === i ? "bg-[var(--acc)] text-[var(--on-acc)]" : "bg-white/[.06] text-[var(--acc-bright)]"}`}><CentralIcone nome={c.icone} size={14} /></span>
                    <div className="min-w-0">
                      <p className={`text-[9px] uppercase tracking-[0.12em] text-[var(--acc)] ${mono}`}>{c.rotulo}</p>
                      <p className="text-[11px] font-semibold leading-snug">{c.nome}</p>
                    </div>
                  </div>
                  <span className={`mt-2 flex items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${destaque === i ? "bg-[linear-gradient(135deg,#fff1c2,#fbbf24_55%,#f59e0b)] text-[var(--on-acc)]" : "bg-white/[.05] text-[var(--body)]"}`}>Usar ferramenta <ChevronRight size={11} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* Cena 1 — personalizar */}
          <div className={camada(1)}>
            <p className="text-sm font-semibold">{ferramenta}</p>
            <div className="mt-2 space-y-1.5">
              {campos.map(([rotulo], k) => (
                <div key={rotulo}>
                  <p className="text-[10px] text-[var(--muted)] mb-0.5">{rotulo}</p>
                  <p className={`rounded-lg border bg-white/[.03] px-2.5 py-1.5 text-[11px] min-h-[28px] transition-colors ${campoAtivo === k ? "border-[var(--acc)] shadow-[0_0_0_3px_rgba(251,191,36,.12)]" : "border-[var(--line)]"}`}>
                    {valores[k]}{campoAtivo === k && <span className="vlp-caret text-[var(--acc)]" />}
                  </p>
                </div>
              ))}
            </div>
            <span className={`mt-3 flex items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#fff1c2,#fbbf24_55%,#f59e0b)] py-2 text-[11px] font-semibold text-[var(--on-acc)] transition-transform ${botao ? "scale-95 brightness-110" : ""}`}>
              <Sparkles size={12} /> Preparar meu prompt
            </span>
          </div>

          {/* Cena 2 — prompt pronto */}
          <div className={camada(2)}>
            <div className={`relative h-[310px] sm:h-[275px] overflow-hidden rounded-lg border border-[var(--line)] bg-black/40 p-3 ${mono} text-[10.5px] leading-relaxed text-[var(--body)] whitespace-pre-wrap`}>
              {tokensPrompt.slice(0, nTok).map((t, i) => <span key={i} className="vlp-tok">{t}</span>)}
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0b0b0e] to-transparent" />
            </div>
            <div className="mt-2.5 flex gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-semibold transition-colors ${copiado ? "bg-emerald-500 text-emerald-950" : "bg-[var(--acc)] text-[var(--on-acc)]"}`}>
                {copiado ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar prompt</>}
              </span>
              <span className="inline-flex items-center rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[10px] text-[var(--body)]">Abrir ChatGPT</span>
              <span className="inline-flex items-center rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[10px] text-[var(--body)]">Abrir Claude</span>
            </div>
          </div>

          {/* Cena 3 — colado na IA */}
          <div className={camada(3)}>
            <div className="flex flex-col gap-2 h-full">
              {colado && (
                <div className="vlp-in self-end max-w-[85%] rounded-2xl rounded-br-md bg-white/[.07] px-3 py-2 text-[10.5px] text-[var(--body)]">
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--text)]"><ClipboardPaste size={11} /> Prompt colado</span>
                  <span className="block truncate">{tokensPrompt.slice(0, 12).join("")}…</span>
                </div>
              )}
              {gerando && <p className={`vlp-shimmer text-[10.5px] ${mono}`} style={{ ["--sh-a" as string]: "rgba(237,235,230,.4)", ["--sh-b" as string]: "#fcd34d" }}>gerando resposta…</p>}
              {nResp > 0 && (
                <div className="space-y-1.5">
                  {tokensResp.map((t, m) => visiveisPorMsg[m] > 0 && (
                    <div key={m} className="max-w-[94%] rounded-2xl rounded-bl-md border border-[var(--line)] bg-black/30 px-3 py-2 text-[10.5px] leading-relaxed text-[var(--body)] whitespace-pre-line">
                      {t.slice(0, visiveisPorMsg[m]).map((w, i) => <span key={i} className="vlp-tok">{w}</span>)}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-auto text-[9px] text-[var(--muted)]">Resposta ilustrativa. A resposta real é gerada pela IA da sua conta.</p>
            </div>
          </div>
        </div>

        {/* Progresso dos 4 passos */}
        <div className="flex gap-1.5 px-4 py-3 border-t border-[var(--line)]">
          {PASSOS.map((p, i) => (
            <span key={p} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= passoAtual ? "bg-[var(--acc)]" : "bg-white/10"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
