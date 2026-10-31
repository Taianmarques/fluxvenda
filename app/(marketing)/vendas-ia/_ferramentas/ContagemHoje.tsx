"use client";

import { useEffect, useState } from "react";

// Contagem regressiva até 23h59 de hoje, no horário de Brasília (o mesmo para qualquer visitante).
// Antes de montar no navegador mostra "--:--:--" para não divergir do HTML do servidor.

function segundosAteMeiaNoite() {
  const partes = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date());
  const v = (t: string) => Number(partes.find(p => p.type === t)?.value ?? 0);
  return Math.max(0, 86399 - (v("hour") * 3600 + v("minute") * 60 + v("second")));
}

const dois = (n: number) => String(n).padStart(2, "0");

export function ContagemHoje({ className = "" }: { className?: string }) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    const tique = () => setRestante(segundosAteMeiaNoite());
    const primeiro = setTimeout(tique, 0);
    const intervalo = setInterval(tique, 1000);
    return () => { clearTimeout(primeiro); clearInterval(intervalo); };
  }, []);

  const texto = restante === null
    ? "--:--:--"
    : `${dois(Math.floor(restante / 3600))}:${dois(Math.floor((restante % 3600) / 60))}:${dois(restante % 60)}`;
  return <span className={`font-[family-name:var(--f-mono)] tabular-nums ${className}`} suppressHydrationWarning>{texto}</span>;
}
