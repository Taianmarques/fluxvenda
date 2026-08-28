"use client";

import { Check, Sun, Moon } from "lucide-react";
import { useCrmTheme, type CrmTheme } from "@/app/(app)/crm/CrmThemeContext";

const OPTIONS: { key: CrmTheme; label: string; description: string; icon: typeof Sun }[] = [
  { key: "dark", label: "Escuro", description: "Fundo escuro em todo o CRM (padrão).", icon: Moon },
  { key: "light", label: "Claro", description: "Fundo claro em todo o CRM.", icon: Sun },
];

// A preferência é só do navegador (localStorage, ver CrmThemeContext.tsx) — não fica salva
// na conta, então muda por dispositivo/navegador.
export function AparenciaClient() {
  const { theme, setTheme } = useCrmTheme();

  return (
    <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
      {OPTIONS.map(opt => {
        const selected = theme === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => setTheme(opt.key)}
            className={`text-left rounded-2xl border-2 p-5 transition-colors ${
              selected ? "border-blue-500" : "border-gray-800 hover:border-gray-700"
            }`}
          >
            {/* Prévia da paleta */}
            <div className={`rounded-xl border mb-4 overflow-hidden ${opt.key === "dark" ? "border-gray-700" : "border-gray-300"}`}>
              <div className={`h-16 p-2 space-y-1.5 ${opt.key === "dark" ? "bg-gray-950" : "bg-gray-50"}`}>
                <div className={`h-2 w-2/3 rounded ${opt.key === "dark" ? "bg-gray-700" : "bg-gray-300"}`} />
                <div className={`h-6 rounded ${opt.key === "dark" ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200"}`} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="font-semibold flex items-center gap-2">
                <opt.icon size={16} className="text-blue-400" /> {opt.label}
              </p>
              {selected && (
                <span className="flex items-center gap-1 text-xs font-medium text-blue-400">
                  <Check size={14} /> Selecionado
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
          </button>
        );
      })}
    </div>
  );
}
