"use client";

import { useState } from "react";
import { ArrowUp, Check, Mic, Plus } from "lucide-react";
import { useRoteiro } from "../_ferramentas/roteiro";

// "Vídeo" em motion da seção 02, no estilo da interface do ChatGPT (tema escuro neutro, balão
// arredondado do usuário, resposta sem balão, cartão de confirmação de ação). Só o estilo: sem logo
// oficial. Mostra a criação de uma campanha pela conversa (a animação irmã, ChatAgente no estilo do
// Claude, mostra a análise). Dados fictícios (avisado). Fica no lugar da gravação real enquanto ela
// não existe. Moldura de vídeo: capítulos, progresso e tempo, em loop.

const G = {
  bg: "#212121",
  bolha: "#303030",
  texto: "#ECECEC",
  suave: "#AFAFAF",
  borda: "#3A3A3A",
};

const PEDIDO = "Crie uma campanha de mensagens no WhatsApp para a minha clínica de estética. R$ 30 por dia, mulheres de 30 a 55 anos, num raio de 8 km.";
const CAMPOS: [string, string][] = [
  ["Objetivo", "Mensagens no WhatsApp"],
  ["Público", "Mulheres, 30 a 55 anos · 8 km"],
  ["Orçamento", "R$ 30 por dia"],
  ["Posicionamento", "Feed, Stories e Reels"],
];
const ANUNCIOS: [string, string][] = [
  ["Dor", "Manchas que não saem com nada?"],
  ["Desejo", "Pele mais uniforme para o fim de ano"],
  ["Bastidor", "Como é a avaliação, passo a passo"],
];
const CAPITULOS = ["Pedido", "Montagem", "Confirmação", "Publicada"];
const DURACAO = 18;
const PARAR = Symbol("parar");

export function MotionGerenciador() {
  const [cap, setCap] = useState(-1);
  const [ferramenta, setFerramenta] = useState(0); // 0 nada · 1 consultando · 2 consultou
  const [campos, setCampos] = useState(0); // quantos campos do rascunho já apareceram
  const [anuncios, setAnuncios] = useState(0);
  const [cartao, setCartao] = useState(false);
  const [clique, setClique] = useState(false);
  const [publicada, setPublicada] = useState(false);
  const [fim, setFim] = useState(false);
  const [t, setT] = useState(0);

  const ref = useRoteiro<HTMLDivElement>(async ({ espera, reduzido }) => {
    if (reduzido) {
      setCap(3); setFerramenta(2); setCampos(CAMPOS.length); setAnuncios(ANUNCIOS.length); setPublicada(true); setFim(true); setT(DURACAO);
      return;
    }
    let decorrido = 0;
    // Espera em pedaços de até 500 ms para o contador de tempo andar mesmo nas pausas longas
    const e = async (ms: number) => {
      for (let resta = ms; resta > 0; resta -= 500) {
        const passo = Math.min(500, resta);
        if (!(await espera(passo))) throw PARAR;
        decorrido += passo;
        setT(Math.min(DURACAO, Math.floor(decorrido / 1000)));
      }
    };
    try {
      setCap(-1); setFerramenta(0); setCampos(0); setAnuncios(0); setCartao(false); setClique(false); setPublicada(false); setFim(false); setT(0);
      await e(600);
      setCap(0); await e(1400);
      setCap(1); setFerramenta(1); await e(1600);
      setFerramenta(2); await e(300);
      for (let c = 1; c <= CAMPOS.length; c++) { setCampos(c); await e(450); }
      for (let a = 1; a <= ANUNCIOS.length; a++) { setAnuncios(a); await e(500); }
      await e(500);
      setCap(2); setCartao(true); await e(2200);
      setClique(true); await e(450);
      setCartao(false); setClique(false);
      setCap(3); setPublicada(true); await e(1200);
      setFim(true); await e(6000);
    } catch (err) {
      if (err !== PARAR) throw err;
    }
  });

  const mmss = (s: number) => `00:${String(s).padStart(2, "0")}`;

  return (
    <div ref={ref} role="img" aria-label="Simulação no estilo do ChatGPT: a IA monta uma campanha de mensagens no WhatsApp a partir de um pedido em português e só publica depois da confirmação" className="w-full min-w-0">
      <div className="rounded-2xl overflow-hidden border font-[family-name:var(--g-texto)]" style={{ background: G.bg, borderColor: G.borda, color: G.texto }}>
        {/* Barra superior */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b" style={{ borderColor: G.borda }}>
          <span className="text-[15px] font-semibold">ChatGPT</span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]" style={{ background: G.bolha, color: G.suave }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" /> Meta Ads
          </span>
        </div>

        {/* Conversa */}
        <div className="px-4 sm:px-5 pt-5 space-y-4 min-h-[452px] text-[13.5px] leading-relaxed">
          {cap >= 0 && (
            <div className="gx-msg flex justify-end">
              <p className="max-w-[85%] rounded-3xl px-4 py-2.5" style={{ background: G.bolha }}>{PEDIDO}</p>
            </div>
          )}

          {ferramenta >= 1 && (
            <p className="gx-msg text-[12.5px]" style={{ color: G.suave }}>
              {ferramenta === 1 ? <span className="animate-pulse">Consultando Meta Ads…</span> : "Consultou Meta Ads · conta de anúncios e página conectadas"}
            </p>
          )}

          {/* Rascunho da campanha */}
          {campos > 0 && (
            <div className="gx-msg overflow-hidden rounded-xl border" style={{ borderColor: G.borda }}>
              <div className="flex items-center justify-between gap-3 px-3 py-2 border-b text-[11px]" style={{ borderColor: G.borda, color: G.suave }}>
                <span className="uppercase tracking-[0.08em]">{publicada ? "Campanha" : "Rascunho da campanha"}</span>
                {publicada
                  ? <span className="gx-msg inline-flex items-center gap-1 rounded-full bg-[#4ADE80]/15 px-2 py-0.5 text-[#4ADE80]"><span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" /> Em análise no Meta</span>
                  : <span>Não publicada</span>}
              </div>
              {CAMPOS.slice(0, campos).map(([k, v]) => (
                <div key={k} className="gx-msg flex justify-between gap-3 px-3 py-1.5 text-[12.5px]">
                  <span style={{ color: G.suave }}>{k}</span><span className="text-right">{v}</span>
                </div>
              ))}
              {anuncios > 0 && (
                <div className="border-t px-3 py-2.5" style={{ borderColor: G.borda }}>
                  <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: G.suave }}>3 anúncios para teste</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {ANUNCIOS.slice(0, anuncios).map(([tipo, gancho]) => (
                      <div key={tipo} className="gx-msg min-w-0 rounded-lg p-2" style={{ background: G.bolha }}>
                        <p className="text-[10px] uppercase tracking-[0.08em] text-[#FFBF24]">{tipo}</p>
                        <p className="mt-0.5 text-[11.5px] leading-snug">“{gancho}”</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cartão de confirmação */}
          {cartao && (
            <div className="gx-msg rounded-2xl border p-4" style={{ borderColor: G.borda, background: "#2A2A2A" }}>
              <p className="font-semibold">Publicar esta campanha?</p>
              <p className="mt-1 text-[12.5px]" style={{ color: G.suave }}>Ela vai para análise do Meta e começa a gastar R$ 30 por dia depois de aprovada.</p>
              <div className="mt-3 flex gap-2">
                <span className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold text-black transition-transform ${clique ? "scale-95 bg-[#d9d9d9]" : "bg-white"}`}>Publicar</span>
                <span className="rounded-full border px-4 py-1.5 text-[12.5px]" style={{ borderColor: G.borda, color: G.suave }}>Editar</span>
              </div>
            </div>
          )}

          {publicada && (
            <div className="gx-msg space-y-2">
              <p className="flex items-center gap-2"><Check size={14} strokeWidth={3} className="text-[#4ADE80] flex-shrink-0" />Campanha publicada com 3 anúncios.</p>
              {fim && <p className="gx-msg">Ela costuma começar a rodar em algumas horas. Em 3 dias, peça um raio-x para ver qual anúncio traz conversas pelo menor custo.</p>}
            </div>
          )}
        </div>

        {/* Caixa de mensagem */}
        <div className="px-4 sm:px-5 pb-4 pt-3">
          <div className="flex items-center gap-2 rounded-full px-3 py-2.5" style={{ background: G.bolha }}>
            <Plus size={16} style={{ color: G.suave }} />
            <span className="flex-1 text-[13px]" style={{ color: G.suave }}>Pergunte qualquer coisa</span>
            <Mic size={15} style={{ color: G.suave }} />
            <span className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center"><ArrowUp size={15} /></span>
          </div>
          <p className="mt-2.5 text-center font-[family-name:var(--g-mono)] text-[10px] uppercase tracking-[0.14em]" style={{ color: G.suave }}>Simulação · conta e anúncios fictícios</p>
        </div>
      </div>

      {/* Moldura de vídeo: capítulos, progresso e tempo */}
      <div className="mt-3 px-1">
        <div className="flex gap-1">
          {CAPITULOS.map((c, i) => (
            <span key={c} className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <span className={`absolute inset-y-0 left-0 rounded-full bg-[var(--gold)] transition-[width] duration-700 ${i < cap || (fim && i === cap) ? "w-full" : i === cap ? "w-1/2" : "w-0"}`} />
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between font-[family-name:var(--g-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--sec)]/60">
          <span className="tabular-nums">{mmss(t)} / {mmss(DURACAO)}</span>
          <span>{cap >= 0 ? CAPITULOS[cap] : "Pedido"}</span>
        </div>
      </div>
    </div>
  );
}
