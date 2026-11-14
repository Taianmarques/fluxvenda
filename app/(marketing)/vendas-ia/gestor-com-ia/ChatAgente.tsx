"use client";

import { useState } from "react";
import { ArrowUp, Check, ChevronRight, Plus } from "lucide-react";
import { useRoteiro } from "../_ferramentas/roteiro";

// Demonstração da seção 02, no estilo da interface do Claude (tema escuro, tons quentes, resposta
// sem balão, indicador de uso da ferramenta). Só o estilo: sem logo oficial. Simulação com dados
// fictícios (avisado na tela). Anima quando visível; com "reduzir movimento" mostra o estado final.
// A animação irmã no estilo do ChatGPT é a MotionGerenciador.

const C = {
  bg: "#262624",
  bolha: "#141413",
  texto: "#F5F4EE",
  suave: "#A6A39A",
  borda: "#3D3D3A",
  acento: "#D97757",
};

const PEDIDO = "Analise minhas campanhas dos últimos sete dias e identifique onde estou desperdiçando dinheiro.";
const CAMPANHAS: { nome: string; custo: string; zona: "Cortar" | "Ajustar" | "Escalar" }[] = [
  { nome: "Promoção de novembro", custo: "R$ 35,00", zona: "Cortar" },
  { nome: "Avaliação gratuita", custo: "R$ 16,30", zona: "Ajustar" },
  { nome: "Antes e depois", custo: "R$ 9,00", zona: "Escalar" },
];
const RECOMENDACOES = [
  "Pausar “Promoção de novembro”: custa quase 4 vezes mais por conversa que “Antes e depois”.",
  "Trocar o criativo de “Avaliação gratuita”: a frequência passou de 3,5 e os cliques estão caindo.",
  "Aumentar aos poucos a verba de “Antes e depois”, estável abaixo da meta há 5 dias.",
];
const COR_ZONA = { Cortar: "#F87171", Ajustar: "#FFBF24", Escalar: "#4ADE80" };
const PARAR = Symbol("parar");

export function ChatAgente() {
  const [etapa, setEtapa] = useState(0); // 0 nada · 1 pedido · 2 ferramenta · 3 tabela · 4–6 recomendações · 7 pergunta final

  const ref = useRoteiro<HTMLDivElement>(async ({ espera, reduzido }) => {
    if (reduzido) { setEtapa(7); return; }
    const e = async (ms: number) => { if (!(await espera(ms))) throw PARAR; };
    try {
      setEtapa(0); await e(500);
      setEtapa(1); await e(1100);
      setEtapa(2); await e(1600);
      setEtapa(3); await e(1300);
      for (let r = 4; r <= 7; r++) { setEtapa(r); await e(750); }
      await e(9000);
    } catch (err) {
      if (err !== PARAR) throw err;
    }
  });

  return (
    <div ref={ref} role="img" aria-label="Simulação no estilo do Claude: a IA usa o Meta Ads, classifica três campanhas e recomenda o que fazer" className="rounded-2xl overflow-hidden border font-[family-name:var(--g-texto)]" style={{ background: C.bg, borderColor: C.borda, color: C.texto }}>
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b" style={{ borderColor: C.borda }}>
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[13px] font-bold" style={{ background: C.acento, color: C.bolha }}>✳</span>
          Claude
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: C.borda, color: C.suave }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" /> Meta Ads
        </span>
      </div>

      {/* Conversa */}
      <div className="px-4 sm:px-5 pt-5 space-y-4 min-h-[452px] text-[13.5px] leading-relaxed">
        {etapa >= 1 && (
          <div className="gx-msg flex justify-end">
            <p className="max-w-[85%] rounded-2xl px-4 py-2.5" style={{ background: C.bolha }}>{PEDIDO}</p>
          </div>
        )}

        {etapa >= 2 && (
          <div className="gx-msg inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px]" style={{ borderColor: C.borda, color: C.suave }}>
            {etapa === 2
              ? <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: C.acento, borderTopColor: "transparent" }} />
              : <Check size={13} style={{ color: C.acento }} />}
            {etapa === 2 ? "Usando Meta Ads: listar campanhas e métricas" : "Usou Meta Ads: 3 campanhas, últimos 7 dias"}
            <ChevronRight size={13} />
          </div>
        )}

        {etapa >= 3 && (
          <div className="gx-msg">
            <p>Analisei as 3 campanhas ativas. Pela sua meta de R$ 15 por conversa:</p>
            <div className="mt-3 overflow-hidden rounded-lg border" style={{ borderColor: C.borda }}>
              {CAMPANHAS.map((c, i) => (
                <div key={c.nome} className={`flex items-center justify-between gap-3 px-3 py-2 ${i ? "border-t" : ""}`} style={{ borderColor: C.borda }}>
                  <span className="truncate">{c.nome}</span>
                  <span className="flex items-center gap-3 flex-shrink-0">
                    <span className="tabular-nums font-[family-name:var(--g-mono)] text-[12px]" style={{ color: C.suave }}>{c.custo}</span>
                    <span className="w-[62px] text-right font-[family-name:var(--g-mono)] text-[10.5px] uppercase" style={{ color: COR_ZONA[c.zona] }}>● {c.zona}</span>
                  </span>
                </div>
              ))}
            </div>
            {etapa >= 4 && (
              <ol className="mt-4 space-y-2">
                {RECOMENDACOES.slice(0, Math.min(3, etapa - 3)).map((r, i) => (
                  <li key={r} className="gx-msg flex gap-2.5"><span style={{ color: C.suave }}>{i + 1}.</span><span>{r}</span></li>
                ))}
              </ol>
            )}
            {etapa >= 7 && <p className="gx-msg mt-4">Quer que eu prepare essas mudanças para você revisar?</p>}
          </div>
        )}
      </div>

      {/* Caixa de mensagem */}
      <div className="px-4 sm:px-5 pb-4 pt-3">
        <div className="flex items-center gap-2 rounded-2xl border px-3 py-2.5" style={{ borderColor: C.borda, background: "#30302E" }}>
          <Plus size={16} style={{ color: C.suave }} />
          <span className="flex-1 text-[13px]" style={{ color: C.suave }}>Escreva uma mensagem…</span>
          <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.acento, color: C.bolha }}><ArrowUp size={15} /></span>
        </div>
        <p className="mt-2.5 text-center font-[family-name:var(--g-mono)] text-[10px] uppercase tracking-[0.14em]" style={{ color: C.suave }}>Simulação · campanhas e números fictícios</p>
      </div>
    </div>
  );
}
