"use client";

import { useRouter, usePathname } from "next/navigation";
import { Calendar } from "lucide-react";

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

  function apply(newFrom: string, newTo: string) {
    router.push(`${pathname}?from=${newFrom}&to=${newTo}`);
  }

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    apply(toInputValue(start.toISOString()), toInputValue(end.toISOString()));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-xl px-2 py-1.5">
        <Calendar size={14} className="text-gray-500 flex-shrink-0" />
        <input
          type="date"
          value={toInputValue(from)}
          max={toInputValue(to)}
          onChange={e => apply(e.target.value, toInputValue(to))}
          className="bg-transparent text-xs focus:outline-none [color-scheme:dark]"
        />
        <span className="text-gray-600 text-xs">até</span>
        <input
          type="date"
          value={toInputValue(to)}
          min={toInputValue(from)}
          max={toInputValue(new Date().toISOString())}
          onChange={e => apply(toInputValue(from), e.target.value)}
          className="bg-transparent text-xs focus:outline-none [color-scheme:dark]"
        />
      </div>
      <div className="flex items-center gap-1">
        {PRESETS.map(p => (
          <button
            key={p.days}
            onClick={() => applyPreset(p.days)}
            className="text-xs text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
