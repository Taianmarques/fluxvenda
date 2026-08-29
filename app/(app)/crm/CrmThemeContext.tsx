"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Preferência única de tema pro CRM inteiro (antes havia 6+ toggles independentes espalhados
// por página, cada um com sua própria chave de localStorage — Mensagens, Pipeline, Comércio,
// Hub, Ao Vivo, Agenda e Dashboards — sem sincronia entre eles). Agora é uma só, trocada em
// Configurações > Aparência (app/(app)/crm/[agentId]/aparencia).
export type CrmTheme = "dark" | "light";

const STORAGE_KEY = "crm-theme";

const CrmThemeContext = createContext<{ theme: CrmTheme; setTheme: (t: CrmTheme) => void }>({
  theme: "dark",
  setTheme: () => {},
});

export function CrmThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<CrmTheme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") setThemeState(saved);
  }, []);

  function setTheme(next: CrmTheme) {
    setThemeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }

  return <CrmThemeContext.Provider value={{ theme, setTheme }}>{children}</CrmThemeContext.Provider>;
}

export function useCrmTheme() {
  return useContext(CrmThemeContext);
}

// Reskina o conteúdo do CRM via CSS var — quase todo componente escuro usa classes Tailwind
// puras (bg-gray-900, border-gray-800, text-gray-400...), que por baixo do Tailwind v4
// resolvem via var(--color-gray-*). Redefinindo essas vars só dentro de
// ".crm-theme-scope[data-theme=light]", tudo que já existe reskina sozinho, sem precisar
// editar cada página. A sidebar (bg-black fixo) fica de fora desse escopo — sempre escura,
// como já era o padrão em Dashboards antes dessa unificação.
export function CrmThemeScope({ children }: { children: React.ReactNode }) {
  const { theme } = useCrmTheme();
  return (
    <div data-theme={theme} className={`crm-theme-scope h-full ${theme === "dark" ? "bg-gray-950 text-white" : "bg-gray-50 text-slate-900"}`}>
      <style>{`
        .crm-theme-scope[data-theme="light"] {
          --color-gray-950: oklch(98.5% 0.002 247.839);
          --color-gray-900: #fff;
          --color-gray-800: oklch(92.8% 0.006 264.531);
          --color-gray-700: oklch(87.2% 0.01 258.338);
          --color-gray-600: oklch(70.7% 0.022 261.325);
          --color-gray-400: oklch(44.6% 0.03 256.802);
          --color-gray-300: oklch(37.3% 0.034 259.733);
          --color-gray-200: oklch(27.8% 0.033 256.848);

          /*
           * Badges/etiquetas de destaque (ex.: "Gestor", "Atendente", "Modo aprendizado")
           * seguem o padrão bg-{cor}-900/NN + text-{cor}-300 + border-{cor}-800/NN, pensado
           * pra compor sobre fundo escuro — sem inverter essas cores de acento também, o
           * texto (claro) fica quase invisível sobre o próprio fundo (também claro) no tema
           * claro. Espelha só os tons realmente usados nesse padrão (900/950 fundo, 800
           * borda, 300 texto) — 600/700/400 ficam de fora de propósito, pois são os tons
           * usados em botões sólidos (bg-blue-600) e não devem clarear.
           */
          --color-blue-950: oklch(97% 0.014 254.604);
          --color-blue-900: oklch(97% 0.014 254.604);
          --color-blue-800: oklch(88.2% 0.059 254.128);
          --color-blue-300: oklch(48.8% 0.243 264.376);

          --color-red-950: oklch(97.1% 0.013 17.38);
          --color-red-900: oklch(97.1% 0.013 17.38);
          --color-red-800: oklch(88.5% 0.062 18.334);
          --color-red-300: oklch(50.5% 0.213 27.518);

          --color-green-950: oklch(98.2% 0.018 155.826);
          --color-green-900: oklch(98.2% 0.018 155.826);
          --color-green-800: oklch(92.5% 0.084 155.995);
          --color-green-300: oklch(52.7% 0.154 150.069);

          --color-purple-950: oklch(97.7% 0.014 308.299);
          --color-purple-900: oklch(97.7% 0.014 308.299);
          --color-purple-800: oklch(90.2% 0.063 306.703);
          --color-purple-300: oklch(49.6% 0.265 301.924);

          --color-amber-950: oklch(98.7% 0.022 95.277);
          --color-amber-900: oklch(98.7% 0.022 95.277);
          --color-amber-800: oklch(92.4% 0.12 95.746);
          --color-amber-300: oklch(55.5% 0.163 48.998);

          --color-yellow-950: oklch(98.7% 0.026 102.212);
          --color-yellow-900: oklch(98.7% 0.026 102.212);
          --color-yellow-800: oklch(94.5% 0.129 101.54);
          --color-yellow-300: oklch(55.4% 0.135 66.442);

          --color-pink-950: oklch(97.1% 0.014 343.198);
          --color-pink-900: oklch(97.1% 0.014 343.198);
          --color-pink-800: oklch(89.9% 0.061 343.231);
          --color-pink-300: oklch(52.5% 0.223 3.958);

          --color-emerald-950: oklch(97.9% 0.021 166.113);
          --color-emerald-900: oklch(97.9% 0.021 166.113);
          --color-emerald-800: oklch(90.5% 0.093 164.15);
          --color-emerald-300: oklch(50.8% 0.118 165.612);

          --color-violet-950: oklch(96.9% 0.016 293.756);
          --color-violet-900: oklch(96.9% 0.016 293.756);
          --color-violet-800: oklch(89.4% 0.057 293.283);
          --color-violet-300: oklch(49.1% 0.27 292.581);
        }
        /*
         * Algumas seções (Mensagens, Pipeline, Comércio, Hub, Ao Vivo, Agenda) já tinham seu
         * próprio par de classes Tailwind dark/light escritas à mão antes dessa unificação —
         * elas escolhem a classe certa via JS (theme/dark), não dependem do truque de CSS var
         * acima. Sem isso, o override de [data-theme=light] reinterpretaria essas classes
         * literais (ex.: bg-gray-200 do modo claro) como se fossem gray-800 invertido, ficando
         * escuras. Este bloco restaura os valores reais do Tailwind dentro dessas raízes.
         */
        .crm-native-scale {
          --color-gray-950: oklch(13% 0.028 261.692);
          --color-gray-900: oklch(21% 0.034 264.665);
          --color-gray-800: oklch(27.8% 0.033 256.848);
          --color-gray-700: oklch(37.3% 0.034 259.733);
          --color-gray-600: oklch(44.6% 0.03 256.802);
          --color-gray-400: oklch(70.7% 0.022 261.325);
          --color-gray-300: oklch(87.2% 0.01 258.338);
          --color-gray-200: oklch(92.8% 0.006 264.531);

          /* Mesma proteção acima, mas pros tons de cor de acento (ver bloco equivalente
             em [data-theme="light"]) — essas 5 seções já escolhem a cor certa via JS. */
          --color-blue-950: oklch(28.2% 0.091 267.935);
          --color-blue-900: oklch(37.9% 0.146 265.522);
          --color-blue-800: oklch(42.4% 0.199 265.638);
          --color-blue-300: oklch(80.9% 0.105 251.813);

          --color-red-950: oklch(25.8% 0.092 26.042);
          --color-red-900: oklch(39.6% 0.141 25.723);
          --color-red-800: oklch(44.4% 0.177 26.899);
          --color-red-300: oklch(80.8% 0.114 19.571);

          --color-green-950: oklch(26.6% 0.065 152.934);
          --color-green-900: oklch(39.3% 0.095 152.535);
          --color-green-800: oklch(44.8% 0.119 151.328);
          --color-green-300: oklch(87.1% 0.15 154.449);

          --color-purple-950: oklch(29.1% 0.149 302.717);
          --color-purple-900: oklch(38.1% 0.176 304.987);
          --color-purple-800: oklch(43.8% 0.218 303.724);
          --color-purple-300: oklch(82.7% 0.119 306.383);

          --color-amber-950: oklch(27.9% 0.077 45.635);
          --color-amber-900: oklch(41.4% 0.112 45.904);
          --color-amber-800: oklch(47.3% 0.137 46.201);
          --color-amber-300: oklch(87.9% 0.169 91.605);

          --color-yellow-950: oklch(28.6% 0.066 53.813);
          --color-yellow-900: oklch(42.1% 0.095 57.708);
          --color-yellow-800: oklch(47.6% 0.114 61.907);
          --color-yellow-300: oklch(90.5% 0.182 98.111);

          --color-pink-950: oklch(28.4% 0.109 3.907);
          --color-pink-900: oklch(40.8% 0.153 2.432);
          --color-pink-800: oklch(45.9% 0.187 3.815);
          --color-pink-300: oklch(82.3% 0.12 346.018);

          --color-emerald-950: oklch(26.2% 0.051 172.552);
          --color-emerald-900: oklch(37.8% 0.077 168.94);
          --color-emerald-800: oklch(43.2% 0.095 166.913);
          --color-emerald-300: oklch(84.5% 0.143 164.978);

          --color-violet-950: oklch(28.3% 0.141 291.089);
          --color-violet-900: oklch(38% 0.189 293.745);
          --color-violet-800: oklch(43.2% 0.232 292.759);
          --color-violet-300: oklch(81.1% 0.111 293.571);
        }
      `}</style>
      {children}
    </div>
  );
}
