"use client";

import { useEffect, useRef } from "react";

// Motor das animações das landings: roda um roteiro assíncrono em loop, só enquanto o bloco está
// visível e a aba está aberta (pausa e retoma de onde parou). Com "reduzir movimento" ligado no
// aparelho, o roteiro recebe reduzido = true e deve só mostrar o estado final, sem animar.

export type Controle = {
  // Espera ms (depois de garantir que está visível); devolve false se o componente saiu da tela de vez
  espera: (ms: number) => Promise<boolean>;
  vivo: () => boolean;
  reduzido: boolean;
};

export function useRoteiro<T extends HTMLElement>(roteiro: (c: Controle) => Promise<void>, threshold = 0.3) {
  const ref = useRef<T>(null);
  const roteiroRef = useRef(roteiro);

  useEffect(() => {
    roteiroRef.current = roteiro;
  });

  useEffect(() => {
    let vivo = true;
    let visivel = false;
    const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window);

    const io = "IntersectionObserver" in window ? new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }, { threshold }) : null;
    if (io && ref.current) io.observe(ref.current);

    const pronto = () => new Promise<void>(resolve => {
      const checar = () => (!vivo || (visivel && !document.hidden) ? resolve() : setTimeout(checar, 250));
      checar();
    });
    const espera = async (ms: number) => {
      await pronto();
      if (!vivo) return false;
      await new Promise(r => setTimeout(r, ms));
      return vivo;
    };

    (async () => {
      if (reduzido) { await roteiroRef.current({ espera: async () => vivo, vivo: () => vivo, reduzido: true }); return; }
      while (vivo) await roteiroRef.current({ espera, vivo: () => vivo, reduzido: false });
    })();

    return () => { vivo = false; io?.disconnect(); };
  }, [threshold]);

  return ref;
}

// Divide um texto em palavras (com o espaço que vem depois), para surgirem uma a uma
export function palavras(texto: string) {
  return texto.match(/\S+\s*/g) ?? [];
}
