"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, Sun, Moon } from "lucide-react";
import { DashboardTabs, type DashboardView } from "./DashboardTabs";
import { DateRangePicker } from "./DateRangePicker";
import { DashboardThemeProvider, type DashboardTheme } from "./DashboardThemeContext";

const THEME_STORAGE_KEY = "dashboards-theme";

// As abas em si (VendasTab, VisaoGeralTab...) continuam Server Components com Prisma direto
// — não recebem o tema como prop. Em vez de reescrever as ~1700 linhas delas, o tema aqui
// reskina via CSS var: essa div raiz redefine as variáveis --color-gray-* do Tailwind v4
// (que todo bg-gray-900/border-gray-800/text-gray-400 etc. já referencia via var()) só
// dentro do escopo ".dashboards-scope[data-theme=light]" — as classes cinza existentes
// nas abas passam a resolver pra tons claros automaticamente, sem tocar no código delas.
// --color-gray-900 vira branco (fundo de card) — por isso o texto próprio deste shell usa
// "slate", nunca "gray-900", pra não ficar branco-no-branco.
export function DashboardsShell({ agentId, view, description, from, to, children }: {
  agentId: string;
  view: DashboardView;
  description: string;
  from: string;
  to: string;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<DashboardTheme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  function toggleTheme() {
    const next: DashboardTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <DashboardThemeProvider value={theme}>
      <div
        data-theme={theme}
        className={`dashboards-scope h-full overflow-y-auto p-6 ${theme === "dark" ? "bg-gray-950 text-white" : "bg-gray-50 text-slate-900"}`}
      >
        <style>{`
          .dashboards-scope[data-theme="light"] {
            --color-gray-950: oklch(98.5% 0.002 247.839);
            --color-gray-900: #fff;
            --color-gray-800: oklch(92.8% 0.006 264.531);
            --color-gray-700: oklch(87.2% 0.01 258.338);
            --color-gray-600: oklch(70.7% 0.022 261.325);
            --color-gray-400: oklch(44.6% 0.03 256.802);
            --color-gray-300: oklch(37.3% 0.034 259.733);
            --color-gray-200: oklch(27.8% 0.033 256.848);
          }
        `}</style>

        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>CRM</p>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-2">
              <LayoutDashboard size={28} className="text-blue-400" /> Dashboards
            </h1>
            <p className={`mt-1 ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>{description}</p>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <DashboardTabs agentId={agentId} activeView={view} />
              <button
                onClick={toggleTheme}
                title={theme === "dark" ? "Mudar para fundo claro" : "Mudar para fundo escuro"}
                className={`p-2.5 rounded-xl border transition-colors ${
                  theme === "dark" ? "bg-gray-900 border-gray-800 hover:bg-gray-800" : "bg-white border-gray-200 hover:bg-gray-100"
                }`}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
            {(view === "vendas" || view === "multiatendimento") && <DateRangePicker from={from} to={to} />}
          </div>

          {children}
        </div>
      </div>
    </DashboardThemeProvider>
  );
}
