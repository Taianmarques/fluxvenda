"use client";

import { useState } from "react";
import { ArrowUp, Check, CirclePause, Plug, Sparkles, TrendingUp } from "lucide-react";
import { palavras, useRoteiro } from "../_ferramentas/roteiro";

// 1ª dobra do Gestor de Tráfego: como funciona, em loop, no mesmo motor e identidade da animação
// da landing Atrair clientes (ilustração, não a tela real do Claude/ChatGPT). Conectar a conta de
// anúncios, pedir em português, a IA ler os números e aplicar a mudança depois da confirmação.
// Conta, campanhas e números são ilustrativos (avisado na própria animação).

const PASSOS = ["Conecte sua conta de anúncios", "Peça em português", "A IA lê os seus números", "Confirme e pronto"];
const PEDIDO = "Onde estou perdendo dinheiro nos últimos 7 dias?";
const LEITURA = "Li as 3 campanhas ativas. O “Promo Limpeza” cansou: frequência 3,8 e custo por conversa de R$ 26,20, mais que o dobro do “Antes e depois”.";
const SUGESTAO = "Sugiro pausar o “Promo Limpeza” e passar a verba dele para o “Antes e depois”. Posso aplicar?";
const ANUNCIOS: { nome: string; gasto: string; custo: string; ruim?: boolean }[] = [
  { nome: "Promo Limpeza", gasto: "R$ 210", custo: "R$ 26,20", ruim: true },
  { nome: "Antes e depois", gasto: "R$ 140", custo: "R$ 11,70" },
  { nome: "Avaliação grátis", gasto: "R$ 95", custo: "R$ 15,80" },
];
const PARAR = Symbol("parar");

const mono = "font-[family-name:var(--f-mono)]";
const vidro = "border border-[var(--line)] bg-[linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.015))]";
const botaoAcc = "bg-[linear-gradient(135deg,#fff1c2,#fbbf24_55%,#f59e0b)] text-[var(--on-acc)]";

export function MotionTrafego() {
  const tokLeitura = palavras(LEITURA);
  const tokSugestao = palavras(SUGESTAO);

  const [cena, setCena] = useState(0);
  const [clicouConectar, setClicouConectar] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [digitado, setDigitado] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [linhas, setLinhas] = useState(0);
  const [marcaRuim, setMarcaRuim] = useState(false);
  const [nLeitura, setNLeitura] = useState(0);
  const [nSugestao, setNSugestao] = useState(0);
  const [clicouAplicar, setClicouAplicar] = useState(false);
  const [aplicado, setAplicado] = useState(0); // quantas ações já apareceram como feitas

  const ref = useRoteiro<HTMLDivElement>(async ({ espera, reduzido }) => {
    if (reduzido) {
      setCena(3); setConectado(true); setDigitado(PEDIDO); setEnviado(true); setLinhas(ANUNCIOS.length); setMarcaRuim(true);
      setNLeitura(tokLeitura.length); setNSugestao(tokSugestao.length); setAplicado(2);
      return;
    }
    const e = async (ms: number) => { if (!(await espera(ms))) throw PARAR; };
    try {
      setCena(0); setClicouConectar(false); setConectando(false); setConectado(false); setDigitado(""); setEnviado(false);
      setLendo(false); setLinhas(0); setMarcaRuim(false); setNLeitura(0); setNSugestao(0); setClicouAplicar(false); setAplicado(0);
      await e(900);
      setClicouConectar(true); await e(300);
      setConectando(true); await e(1300);
      setConectando(false); setConectado(true); await e(1400);

      setCena(1); await e(600);
      for (let n = 2; n <= PEDIDO.length + 1; n += 2) { setDigitado(PEDIDO.slice(0, n)); await e(28); }
      await e(400);
      setEnviado(true); await e(700);

      setCena(2); setLendo(true); await e(1300); setLendo(false);
      for (let l = 1; l <= ANUNCIOS.length; l++) { setLinhas(l); await e(320); }
      await e(300); setMarcaRuim(true); await e(300);
      for (let t = 1; t <= tokLeitura.length; t++) { setNLeitura(t); await e(38); }
      await e(1600);

      setCena(3); await e(400);
      for (let t = 1; t <= tokSugestao.length; t++) { setNSugestao(t); await e(38); }
      await e(700);
      setClicouAplicar(true); await e(500);
      setAplicado(1); await e(600);
      setAplicado(2); await e(4500);
    } catch (err) {
      if (err !== PARAR) throw err;
    }
  });

  const camada = (i: number) => `absolute inset-0 p-3 sm:p-4 transition-opacity duration-500 ${cena === i ? "opacity-100" : "opacity-0 pointer-events-none"}`;
  const balaoVoce = "self-end max-w-[85%] rounded-2xl rounded-br-md bg-white/[.07] px-3 py-2 text-[11px]";
  const balaoIa = "max-w-[94%] rounded-2xl rounded-bl-md border border-[rgba(251,191,36,.3)] bg-[var(--acc-dim)] px-3 py-2 text-[11px] leading-relaxed";

  return (
    <div ref={ref} className="rounded-2xl border border-[var(--line-strong)] bg-white/[.03] p-2 shadow-[0_40px_120px_-30px_rgba(251,191,36,.3)]" aria-label="Animação: conta de anúncios do Meta conectada à IA, que analisa as campanhas e ajusta a verba depois da confirmação" role="img">
      <div className="rounded-xl overflow-hidden border border-[var(--line)] bg-[#0b0b0e] text-[var(--text)]">
        <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-3 border-b border-[var(--line)]">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className={`text-[11px] text-[var(--acc)] ${mono}`}>0{cena + 1}</span>
            <p key={cena} className="vlp-in text-lg sm:text-xl leading-tight">
              <em className="font-[family-name:var(--f-serif)] italic text-[var(--acc-bright)]">{PASSOS[cena]}</em>
            </p>
          </div>
          <span className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] transition-colors duration-500 ${conectado ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[.06] text-[var(--muted)]"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${conectado ? "bg-emerald-400" : "bg-white/30"}`} /> Meta Ads
          </span>
        </div>

        <div className="relative h-[380px] sm:h-[350px]">
          {/* Cena 0 — conectar */}
          <div className={camada(0)}>
            <p className="text-[11px] text-[var(--muted)]">Claude · ChatGPT › Conectores</p>
            <div className={`mt-3 rounded-xl p-4 transition-all duration-300 ${conectado ? "border border-emerald-500/40 bg-emerald-500/[.06]" : vidro}`}>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#1877f2]/20 text-[#7fb2ff] flex items-center justify-center"><Plug size={18} /></span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Meta Ads</p>
                  <p className="text-[11px] text-[var(--body)]">Campanhas, públicos, anúncios e métricas</p>
                </div>
              </div>
              <div className="mt-4 h-9">
                {conectado ? (
                  <div className="vlp-in flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-[11px] text-emerald-200">
                    <Check size={13} /> Conectado · Clínica Bella Pele · 3 campanhas ativas
                  </div>
                ) : (
                  <span className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-semibold transition-transform ${botaoAcc} ${clicouConectar ? "scale-95 brightness-110" : ""}`}>
                    {conectando
                      ? <span className="vlp-shimmer" style={{ ["--sh-a" as string]: "rgba(43,27,2,.55)", ["--sh-b" as string]: "#2b1b02" }}>Autorizando com o Facebook…</span>
                      : <><Plug size={12} /> Conectar conta de anúncios</>}
                  </span>
                )}
              </div>
            </div>
            <ul className="mt-4 space-y-1.5 text-[11px] text-[var(--body)]">
              {["Lê campanhas e métricas da sua conta", "Cria e ajusta campanhas quando você pede", "Você pode desconectar quando quiser"].map(t => (
                <li key={t} className="flex gap-2"><Check size={13} className="text-[var(--acc)] flex-shrink-0" />{t}</li>
              ))}
            </ul>
          </div>

          {/* Cena 1 — pedir */}
          <div className={camada(1)}>
            <div className="flex flex-col h-full">
              <div className="flex-1 flex flex-col justify-end gap-2">
                {enviado && <p className={`vlp-in ${balaoVoce}`}>{PEDIDO}</p>}
              </div>
              <div className={`mt-3 flex items-end gap-2 rounded-xl border px-3 py-2.5 transition-colors ${enviado ? "border-[var(--line)]" : "border-[var(--acc)] shadow-[0_0_0_3px_rgba(251,191,36,.12)]"}`}>
                <p className="flex-1 min-h-[18px] text-[11.5px]">
                  {enviado ? <span className="text-[var(--muted)]">Pergunte qualquer coisa sobre seus anúncios</span> : <>{digitado}<span className="vlp-caret text-[var(--acc)]" /></>}
                </p>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${digitado && !enviado ? botaoAcc : "bg-white/[.08] text-[var(--muted)]"}`}><ArrowUp size={14} /></span>
              </div>
            </div>
          </div>

          {/* Cena 2 — a IA lê os números */}
          <div className={camada(2)}>
            <div className="flex flex-col gap-2 h-full">
              <p className={balaoVoce}>{PEDIDO}</p>
              {lendo && <p className={`vlp-shimmer text-[10.5px] ${mono}`} style={{ ["--sh-a" as string]: "rgba(237,235,230,.4)", ["--sh-b" as string]: "#fcd34d" }}>lendo campanhas no Meta Ads…</p>}
              {linhas > 0 && (
                <div className="rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2">
                  <div className={`grid grid-cols-[1fr_auto_auto] gap-x-3 text-[9.5px] uppercase tracking-[0.1em] text-[var(--muted)] ${mono}`}>
                    <span>Anúncio</span><span className="text-right">Gasto</span><span className="text-right">Custo/conversa</span>
                  </div>
                  {ANUNCIOS.slice(0, linhas).map(a => (
                    <div key={a.nome} className={`vlp-in grid grid-cols-[1fr_auto_auto] gap-x-3 items-center border-t border-[var(--line)] py-1.5 text-[11px] transition-colors duration-500 ${a.ruim && marcaRuim ? "text-red-300" : ""}`}>
                      <span className="truncate">{a.nome}</span>
                      <span className={`text-right tabular-nums ${mono}`}>{a.gasto}</span>
                      <span className={`text-right tabular-nums ${mono}`}>{a.custo}</span>
                    </div>
                  ))}
                </div>
              )}
              {nLeitura > 0 && (
                <div className={balaoIa}>
                  {tokLeitura.slice(0, nLeitura).map((w, i) => <span key={i} className="vlp-tok">{w}</span>)}
                </div>
              )}
            </div>
          </div>

          {/* Cena 3 — confirmar e aplicar */}
          <div className={camada(3)}>
            <div className="flex flex-col gap-2 h-full">
              {nSugestao > 0 && (
                <div className={balaoIa}>
                  <p className="mb-1 flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.14em] text-[var(--acc)]"><Sparkles size={11} /> IA</p>
                  {tokSugestao.slice(0, nSugestao).map((w, i) => <span key={i} className="vlp-tok">{w}</span>)}
                </div>
              )}
              {nSugestao >= tokSugestao.length && (
                aplicado === 0 ? (
                  <div className="vlp-in flex gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10.5px] font-semibold transition-transform ${botaoAcc} ${clicouAplicar ? "scale-95 brightness-110" : ""}`}><Check size={11} /> Pode aplicar</span>
                    <span className="inline-flex items-center rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[10.5px] text-[var(--body)]">Agora não</span>
                  </div>
                ) : (
                  <p className={`vlp-in ${balaoVoce}`}>Pode aplicar.</p>
                )
              )}
              {aplicado > 0 && (
                <div className="space-y-1.5">
                  <div className="vlp-in flex items-center gap-2 rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2 text-[11px]">
                    <CirclePause size={14} className="text-red-300 flex-shrink-0" /> <span className="flex-1">“Promo Limpeza” pausado</span><Check size={13} className="text-emerald-400" />
                  </div>
                  {aplicado > 1 && (
                    <div className="vlp-in flex items-center gap-2 rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2 text-[11px]">
                      <TrendingUp size={14} className="text-emerald-300 flex-shrink-0" /> <span className="flex-1">“Antes e depois”: R$ 20 → R$ 50/dia</span><Check size={13} className="text-emerald-400" />
                    </div>
                  )}
                </div>
              )}
              <p className="mt-auto text-[9px] text-[var(--muted)]">Ilustração. Conta e números fictícios; a resposta real depende da sua conta e da IA que você usar.</p>
            </div>
          </div>
        </div>

        {/* Progresso dos 4 passos */}
        <div className="flex gap-1.5 px-4 py-3 border-t border-[var(--line)]">
          {PASSOS.map((p, i) => (
            <span key={p} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= cena ? "bg-[var(--acc)]" : "bg-white/10"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
