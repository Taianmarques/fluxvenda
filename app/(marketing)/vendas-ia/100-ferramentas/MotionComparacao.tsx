"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { palavras, useRoteiro } from "./roteiro";

type Lado = { titulo: string; pedido: string; resposta: string; itens: string[] };
const PARAR = Symbol("parar");

// "O mesmo pedido, duas respostas": à esquerda, o pedido solto que quase todo mundo faz; à direita,
// o prompt montado pela ferramenta. Pedido digitado, status "gerando…", resposta surgindo palavra
// por palavra e a avaliação (✕ / ✓). Animação ilustrativa, em loop.
export function MotionComparacao({ sem, com }: { sem: Lado; com: Lado }) {
  const tokSem = palavras(sem.resposta);
  const tokCom = palavras(com.resposta);

  const [digitado, setDigitado] = useState<[number, number]>([0, 0]);
  const [gerando, setGerando] = useState(false);
  const [nSem, setNSem] = useState(0);
  const [nCom, setNCom] = useState(0);
  const [itensSem, setItensSem] = useState(0);
  const [itensCom, setItensCom] = useState(0);

  const ref = useRoteiro<HTMLDivElement>(async ({ espera, reduzido }) => {
    if (reduzido) {
      setDigitado([sem.pedido.length, com.pedido.length]); setNSem(tokSem.length); setNCom(tokCom.length);
      setItensSem(sem.itens.length); setItensCom(com.itens.length);
      return;
    }
    const e = async (ms: number) => { if (!(await espera(ms))) throw PARAR; };
    try {
      setDigitado([0, 0]); setGerando(false); setNSem(0); setNCom(0); setItensSem(0); setItensCom(0);
      await e(600);
      const maior = Math.max(sem.pedido.length, com.pedido.length);
      for (let n = 2; n <= maior + 1; n += 2) { setDigitado([Math.min(n, sem.pedido.length), Math.min(n, com.pedido.length)]); await e(22); }
      setDigitado([sem.pedido.length, com.pedido.length]);
      await e(300); setGerando(true); await e(1600); setGerando(false);
      for (let t = 1; t <= tokSem.length; t++) { setNSem(t); await e(45); }
      for (let i = 1; i <= sem.itens.length; i++) { await e(380); setItensSem(i); }
      await e(500);
      for (let t = 1; t <= tokCom.length; t++) { setNCom(t); await e(45); }
      for (let i = 1; i <= com.itens.length; i++) { await e(380); setItensCom(i); }
      await e(6500);
    } catch (err) {
      if (err !== PARAR) throw err;
    }
  }, 0.25);

  const painel = (l: Lado, lado: "sem" | "com") => {
    const n = lado === "sem" ? nSem : nCom;
    const tok = lado === "sem" ? tokSem : tokCom;
    const itens = lado === "sem" ? itensSem : itensCom;
    const dig = digitado[lado === "sem" ? 0 : 1];
    const bom = lado === "com";
    return (
      <div className={`rounded-2xl border p-4 md:p-5 flex flex-col gap-3 min-h-[25rem] ${bom ? "border-[rgba(251,191,36,.35)] bg-[linear-gradient(160deg,rgba(251,191,36,.07),rgba(255,255,255,.01))]" : "border-[var(--line)] bg-white/[.025]"}`}>
        <p className={`font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase ${bom ? "text-[var(--acc)]" : "text-[var(--muted)]"}`}>{l.titulo}</p>
        <div className="self-end max-w-[90%] rounded-2xl rounded-br-md bg-white/[.07] px-3.5 py-2.5 text-sm text-[var(--text)] min-h-[2.6rem]">
          {l.pedido.slice(0, dig)}{dig < l.pedido.length && <span className="vlp-caret text-[var(--acc)]" />}
        </div>
        {gerando && <p className="vlp-shimmer text-xs font-[family-name:var(--f-mono)]" style={{ ["--sh-a" as string]: "rgba(237,235,230,.4)", ["--sh-b" as string]: "#fcd34d" }}>gerando resposta…</p>}
        {n > 0 && (
          <div className="max-w-[95%] rounded-2xl rounded-bl-md border border-[var(--line)] bg-black/30 px-3.5 py-3 text-sm leading-relaxed text-[var(--body)] whitespace-pre-line">
            {tok.slice(0, n).map((w, i) => <span key={i} className="vlp-tok">{w}</span>)}
          </div>
        )}
        {itens > 0 && (
          <ul className="mt-auto space-y-1.5">
            {l.itens.slice(0, itens).map(t => (
              <li key={t} className={`vlp-in flex items-center gap-2 text-sm ${bom ? "text-[var(--text)]" : "text-[var(--muted)]"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${bom ? "bg-[var(--acc)] text-[var(--on-acc)]" : "bg-red-500/15 text-red-300"}`}>
                  {bom ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                </span>
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div ref={ref}>
      <div className="grid md:grid-cols-2 gap-4" aria-hidden>
        {painel(sem, "sem")}
        {painel(com, "com")}
      </div>
      <p className="sr-only">Comparação: um pedido genérico gera uma mensagem genérica; o prompt montado pela Vendas IA, com o contexto do cliente, gera mensagens específicas.</p>
      <p className="mt-3 text-center text-xs text-[var(--muted)]">Animação ilustrativa. As respostas reais são geradas pelo ChatGPT ou pelo Claude da sua conta.</p>
    </div>
  );
}
