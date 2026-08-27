"use client";

import { useState } from "react";
import { CalendarClock, LifeBuoy, PlayCircle, type LucideIcon } from "lucide-react";
import { AgendarDemoModal } from "./AgendarDemoModal";

type Recurso = {
  icon: LucideIcon;
  label: string;
  description: string;
  ativo: boolean;
};

const RECURSOS: Recurso[] = [
  { icon: CalendarClock, label: "Agendar uma demonstração", description: "40 min com o time FluxVenda", ativo: true },
  { icon: PlayCircle, label: "Assistir à introdução", description: "Em breve", ativo: false },
  { icon: LifeBuoy, label: "Central de ajuda", description: "Em breve", ativo: false },
];

export function RecursosSidebar() {
  const [demoAberto, setDemoAberto] = useState(false);

  return (
    <>
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 space-y-1 h-fit">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">Recursos</p>
        {RECURSOS.map(r => (
          <button
            key={r.label}
            disabled={!r.ativo}
            onClick={() => r.label === "Agendar uma demonstração" && setDemoAberto(true)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
              r.ativo ? "hover:bg-gray-50 cursor-pointer" : "cursor-not-allowed opacity-50"
            }`}
          >
            <r.icon size={18} className="text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
              <p className="text-xs text-gray-400 truncate">{r.description}</p>
            </div>
          </button>
        ))}
      </div>

      {demoAberto && <AgendarDemoModal onClose={() => setDemoAberto(false)} />}
    </>
  );
}
