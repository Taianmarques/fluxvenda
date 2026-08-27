"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PlanosModal } from "./PlanosModal";

export function VerPlanosCard() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="w-full bg-white border border-gray-200 shadow-sm rounded-2xl p-4 flex items-center gap-3 text-left hover:border-blue-300 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">Ver planos</p>
          <p className="text-xs text-gray-400 truncate">Conheça os planos do CRM</p>
        </div>
      </button>

      {aberto && <PlanosModal onClose={() => setAberto(false)} />}
    </>
  );
}
