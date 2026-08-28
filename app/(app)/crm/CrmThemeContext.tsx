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
        }
      `}</style>
      {children}
    </div>
  );
}
