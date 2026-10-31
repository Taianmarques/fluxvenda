"use client";

import { useState } from "react";
import { MotionComparacao } from "./MotionComparacao";

type Lado = Parameters<typeof MotionComparacao>[0]["sem"];
export type AbaDemo = { rotulo: string; sem: Lado; com: Lado };

// "Veja na prática" em abas: cada aba é uma comparação pedido genérico × prompt da ferramenta.
// Trocar de aba remonta a animação (key), que recomeça do início.
export function DemoAbas({ abas }: { abas: AbaDemo[] }) {
  const [ativa, setAtiva] = useState(0);
  const aba = abas[ativa];
  return (
    <div>
      <div role="tablist" aria-label="Exemplos" className="flex flex-wrap justify-center gap-2">
        {abas.map((a, i) => (
          <button
            key={a.rotulo} type="button" role="tab" aria-selected={i === ativa} onClick={() => setAtiva(i)}
            className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${i === ativa ? "border-[var(--acc)] bg-[var(--acc-dim)] text-[var(--acc-bright)]" : "border-[var(--line-strong)] text-[var(--body)] hover:text-[var(--text)]"}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <div className="mt-8" role="tabpanel">
        <MotionComparacao key={ativa} sem={aba.sem} com={aba.com} />
      </div>
    </div>
  );
}
