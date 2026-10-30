"use client";

import { useState } from "react";
import { Check, ChevronRight, ClipboardPaste, Copy, Search, Sparkles } from "lucide-react";
import { CentralIcone } from "@/lib/central-icons";
import { palavras, useRoteiro } from "./roteiro";

export type CardMotion = { rotulo: string; nome: string; icone: string; modulo: string };

const PASSOS = ["Escolha", "Personalize", "Prepare", "Use na sua IA"];
const MAX_TOKENS_PROMPT = 85;
const PARAR = Symbol("parar");

// 1ª dobra: a plataforma funcionando, em loop — escolher a ferramenta, preencher o formulário,
// preparar e copiar o prompt (o texto real montado pela plataforma) e colar na IA. A resposta da
// IA no fim é ilustrativa (a plataforma não executa IA nenhuma).
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
      for (const i of [0, 1, alvo]) { setDestaque(i); await e(480); }
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

  // Quantas palavras da resposta já apareceram em cada mensagem
  const visiveisPorMsg = tokensResp.map((t, m) => {
    const antes = tokensResp.slice(0, m).reduce((s, x) => s + x.length, 0);
    return Math.max(0, Math.min(t.length, nResp - antes));
  });

  return (
    <div ref={ref} className="rounded-2xl border border-[var(--line-strong)] bg-white/[.03] p-2 shadow-[0_40px_120px_-30px_rgba(251,191,36,.25)]" aria-label="Animação: a plataforma Vendas IA preparando um prompt" role="img">
      <div className="rounded-xl overflow-hidden bg-[#f4f6fb] text-slate-900">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-white border-b border-slate-200">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200" /><span className="w-2.5 h-2.5 rounded-full bg-slate-200" /><span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          <span className="ml-2 text-[10px] text-slate-400 font-[family-name:var(--f-mono)] truncate">
            {cena === 3 ? "Sua IA · ChatGPT ou Claude" : cena === 0 ? "Vendas IA · Minha Biblioteca" : `Vendas IA · ${ferramenta}`}
          </span>
        </div>

        <div className="relative h-[330px] sm:h-[360px]">
          {/* Cena 0 — escolher a ferramenta */}
          <div className={camada(0)}>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-400">
              <Search size={13} /> Buscar ferramentas…
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {cards.map((c, i) => (
                <div key={c.nome} className={`rounded-xl border bg-white p-2.5 transition-all duration-300 ${i > 3 ? "hidden sm:block" : ""} ${destaque === i ? "border-blue-500 ring-2 ring-blue-500/20 -translate-y-0.5 shadow-md" : "border-slate-200"} ${destaque === i && clicado ? "scale-[.97]" : ""}`}>
                  <div className="flex items-start gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><CentralIcone nome={c.icone} size={14} /></span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-blue-600">{c.rotulo}</p>
                      <p className="text-[11px] font-semibold leading-snug">{c.nome}</p>
                    </div>
                  </div>
                  <span className={`mt-2 flex items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${destaque === i ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"}`}>Usar ferramenta <ChevronRight size={11} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* Cena 1 — personalizar */}
          <div className={camada(1)}>
            <p className="text-sm font-bold">{ferramenta}</p>
            <div className="mt-2.5 space-y-2">
              {campos.map(([rotulo], k) => (
                <div key={rotulo}>
                  <p className="text-[10px] text-slate-500 mb-0.5">{rotulo}</p>
                  <p className={`rounded-lg border bg-white px-2.5 py-1.5 text-[11px] min-h-[28px] transition-colors ${campoAtivo === k ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-200"}`}>
                    {valores[k]}{campoAtivo === k && <span className="vlp-caret text-blue-600" />}
                  </p>
                </div>
              ))}
            </div>
            <span className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-[11px] font-semibold text-white transition-transform ${botao ? "scale-95 brightness-110" : ""}`}>
              <Sparkles size={12} /> Preparar meu prompt
            </span>
          </div>

          {/* Cena 2 — prompt pronto */}
          <div className={camada(2)}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">Seu prompt está pronto</p>
            <div className="relative mt-2 h-[230px] sm:h-[255px] overflow-hidden rounded-lg border border-slate-200 bg-white p-3 font-[family-name:var(--f-mono)] text-[10.5px] leading-relaxed text-slate-700 whitespace-pre-wrap">
              {tokensPrompt.slice(0, nTok).map((t, i) => <span key={i} className="vlp-tok">{t}</span>)}
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
            </div>
            <div className="mt-2.5 flex gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-semibold transition-colors ${copiado ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}`}>
                {copiado ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar prompt</>}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px]">Abrir ChatGPT</span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px]">Abrir Claude</span>
            </div>
          </div>

          {/* Cena 3 — colado na IA */}
          <div className={`${camada(3)} bg-white`}>
            <div className="flex flex-col gap-2 h-full">
              {colado && (
                <div className="vlp-in self-end max-w-[85%] rounded-2xl rounded-br-md bg-slate-100 px-3 py-2 text-[10.5px] text-slate-600">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-800"><ClipboardPaste size={11} /> Prompt colado</span>
                  <span className="block truncate">{tokensPrompt.slice(0, 12).join("")}…</span>
                </div>
              )}
              {gerando && <p className="vlp-shimmer text-[10.5px] font-[family-name:var(--f-mono)]" style={{ ["--sh-a" as string]: "#94a3b8", ["--sh-b" as string]: "#2563eb" }}>gerando resposta…</p>}
              {nResp > 0 && (
                <div className="space-y-1.5">
                  {tokensResp.map((t, m) => visiveisPorMsg[m] > 0 && (
                    <div key={m} className="max-w-[92%] rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-3 py-2 text-[10.5px] leading-relaxed text-slate-700">
                      {t.slice(0, visiveisPorMsg[m]).map((w, i) => <span key={i} className="vlp-tok">{w}</span>)}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-auto text-[9px] text-slate-400">Resposta ilustrativa. A resposta real é gerada pela IA da sua conta.</p>
            </div>
          </div>
        </div>

        {/* Passos */}
        <div className="grid grid-cols-4 border-t border-slate-200 bg-white">
          {PASSOS.map((p, i) => (
            <span key={p} className={`py-2 text-center text-[9.5px] sm:text-[10.5px] font-semibold transition-colors ${i === passoAtual ? "text-blue-700 bg-blue-50" : i < passoAtual ? "text-slate-500" : "text-slate-300"}`}>
              {i + 1}. {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
