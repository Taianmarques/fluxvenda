"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useRoteiro } from "../_ferramentas/roteiro";

// Demonstração da seção 02: conversa com a IA conectada ao Meta Ads. Simulação (dados fictícios,
// avisado na tela). Anima de leve uma vez por ciclo, só quando está visível; com "reduzir
// movimento" mostra direto o estado final.

const PEDIDO = "Analise minhas campanhas dos últimos sete dias e identifique onde estou desperdiçando dinheiro.";
const CAMPANHAS: { nome: string; gasto: string; resultados: string; custo: string; zona: "Cortar" | "Ajustar" | "Escalar" }[] = [
  { nome: "Promoção de novembro", gasto: "R$ 420", resultados: "12", custo: "R$ 35,00", zona: "Cortar" },
  { nome: "Avaliação gratuita", gasto: "R$ 310", resultados: "19", custo: "R$ 16,30", zona: "Ajustar" },
  { nome: "Antes e depois", gasto: "R$ 280", resultados: "31", custo: "R$ 9,00", zona: "Escalar" },
];
const RECOMENDACOES = [
  "Pausar “Promoção de novembro”: custa quase 4 vezes mais por conversa que “Antes e depois”.",
  "Trocar o criativo de “Avaliação gratuita”: a frequência passou de 3,5 e os cliques estão caindo.",
  "Aumentar aos poucos a verba de “Antes e depois”, que está estável abaixo da meta há 5 dias.",
];
const COR_ZONA = { Cortar: "text-[#F87171] border-[#F87171]/30", Ajustar: "text-[var(--gold)] border-[var(--gold)]/35", Escalar: "text-[#4ADE80] border-[#4ADE80]/30" };
const PARAR = Symbol("parar");

export function ChatAgente() {
  const [etapa, setEtapa] = useState(0); // 0 nada · 1 pedido · 2 lendo · 3 tabela · 4+ recomendações (4 = 1ª, 5 = 2ª, 6 = 3ª)

  const ref = useRoteiro<HTMLDivElement>(async ({ espera, reduzido }) => {
    if (reduzido) { setEtapa(6); return; }
    const e = async (ms: number) => { if (!(await espera(ms))) throw PARAR; };
    try {
      setEtapa(0); await e(500);
      setEtapa(1); await e(1100);
      setEtapa(2); await e(1500);
      setEtapa(3); await e(1300);
      for (let r = 4; r <= 6; r++) { setEtapa(r); await e(700); }
      await e(9000);
    } catch (err) {
      if (err !== PARAR) throw err;
    }
  });

  return (
    <div ref={ref} role="img" aria-label="Simulação: a IA analisa três campanhas do Meta Ads, classifica cada uma e recomenda o que fazer" className="rounded-2xl border border-[var(--line)] bg-[var(--card)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)]">
        <span className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-[var(--gold)]" /> ChatGPT · Claude</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 py-1 font-[family-name:var(--g-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--sec)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" /> Meta Ads conectado
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-3 min-h-[440px] text-sm">
        {etapa >= 1 && (
          <p className="gx-msg ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-white/[.07] px-4 py-2.5 text-[var(--txt)]">{PEDIDO}</p>
        )}
        {etapa === 2 && <p className="gx-msg font-[family-name:var(--g-mono)] text-xs text-[var(--sec)]">Lendo campanhas no Meta Ads…</p>}
        {etapa >= 3 && (
          <div className="gx-msg rounded-2xl rounded-bl-md border border-[var(--line)] bg-black/30 p-4">
            <p className="text-[var(--txt)]">Analisei as 3 campanhas ativas. Classifiquei cada uma pela sua meta de R$ 15 por conversa:</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-[var(--line)]">
              <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 py-2 font-[family-name:var(--g-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--sec)]/70">
                <span>Campanha</span><span className="hidden sm:block text-right">Gasto</span><span className="text-right">Custo/conversa</span><span className="text-right">Zona</span>
              </div>
              {CAMPANHAS.map(c => (
                <div key={c.nome} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-t border-[var(--line)] px-3 py-2 text-[13px]">
                  <span className="truncate text-[var(--txt)]">{c.nome}</span>
                  <span className="hidden sm:block text-right tabular-nums font-[family-name:var(--g-mono)] text-[var(--sec)]">{c.gasto}</span>
                  <span className="text-right tabular-nums font-[family-name:var(--g-mono)] text-[var(--txt)]">{c.custo}</span>
                  <span className={`justify-self-end rounded-full border px-2 py-0.5 font-[family-name:var(--g-mono)] text-[10px] uppercase ${COR_ZONA[c.zona]}`}>{c.zona}</span>
                </div>
              ))}
            </div>
            {etapa >= 4 && (
              <ol className="mt-4 space-y-2">
                {RECOMENDACOES.slice(0, etapa - 3).map((r, i) => (
                  <li key={r} className="gx-msg flex gap-2.5 text-[var(--sec)]">
                    <span className="font-[family-name:var(--g-mono)] text-xs text-[var(--gold)] mt-0.5">0{i + 1}</span>{r}
                  </li>
                ))}
              </ol>
            )}
            {etapa >= 6 && <p className="gx-msg mt-4 font-semibold text-[var(--txt)]">Quer que eu prepare essas mudanças para você revisar?</p>}
          </div>
        )}
      </div>

      <p className="border-t border-[var(--line)] px-4 py-2.5 font-[family-name:var(--g-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--sec)]/70">Simulação · campanhas e números fictícios</p>
    </div>
  );
}
