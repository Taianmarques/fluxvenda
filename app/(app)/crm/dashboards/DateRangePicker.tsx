"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { useDashboardTheme } from "./DashboardThemeContext";

const PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

function toInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = useDashboardTheme();

  // Preserva outros parâmetros já na URL (ex: ?view=vendas) — só troca from/to
  function apply(newFrom: string, newTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", newFrom);
    params.set("to", newTo);
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    apply(toInputValue(start.toISOString()), toInputValue(end.toISOString()));
  }

  const colorScheme = theme === "dark" ? "[color-scheme:dark]" : "[color-scheme:light]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={`flex items-center gap-1.5 border rounded-xl px-2 py-1.5 ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
        <Calendar size={14} className="text-gray-500 flex-shrink-0" />
        <input
          type="date"
          value={toInputValue(from)}
          max={toInputValue(to)}
          onChange={e => apply(e.target.value, toInputValue(to))}
          className={`bg-transparent text-xs focus:outline-none ${colorScheme}`}
        />
        <span className="text-gray-600 text-xs">até</span>
        <input
          type="date"
          value={toInputValue(to)}
          min={toInputValue(from)}
          max={toInputValue(new Date().toISOString())}
          onChange={e => apply(toInputValue(from), e.target.value)}
          className={`bg-transparent text-xs focus:outline-none ${colorScheme}`}
        />
      </div>
      <div className="flex items-center gap-1">
        {PRESETS.map(p => (
          <button
            key={p.days}
            onClick={() => applyPreset(p.days)}
            className={`text-xs rounded-lg px-2.5 py-1.5 border transition-colors ${
              theme === "dark" ? "text-gray-400 hover:text-white border-gray-800 hover:border-gray-600" : "text-gray-500 hover:text-slate-900 border-gray-200 hover:border-gray-400"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
