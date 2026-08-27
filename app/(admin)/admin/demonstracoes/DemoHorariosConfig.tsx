"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

// Configura os horários fixos (seg-sex) da aba Recursos > Agendar uma demonstração
// (app/(app)/crm/hub/AgendarDemoModal.tsx) — lidos de PlatformSettings.demoAvailableTimes.
export function DemoHorariosConfig({ initialTimes }: { initialTimes: string[] }) {
  const [times, setTimes] = useState(initialTimes);
  const [novoHorario, setNovoHorario] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(next: string[]) {
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/demo-horarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ times: next }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTimes(data.times);
    } catch {
      setErro("Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  function adicionar() {
    if (!novoHorario || times.includes(novoHorario)) return;
    salvar([...times, novoHorario].sort());
    setNovoHorario("");
  }

  function remover(time: string) {
    salvar(times.filter(t => t !== time));
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
      <div>
        <p className="font-semibold text-gray-300">Horários da demonstração</p>
        <p className="text-xs text-gray-500 mt-0.5">Seg a sex, 40 min cada — horários oferecidos na aba Recursos.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {times.map(t => (
          <span key={t} className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm">
            {t}
            <button onClick={() => remover(t)} disabled={salvando} className="text-gray-500 hover:text-red-400">
              <X size={13} />
            </button>
          </span>
        ))}
        {times.length === 0 && <p className="text-xs text-gray-500">Nenhum horário configurado.</p>}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="time"
          value={novoHorario}
          onChange={e => setNovoHorario(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
        />
        <button
          onClick={adicionar}
          disabled={!novoHorario || salvando}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 text-sm font-medium"
        >
          <Plus size={14} /> Adicionar
        </button>
        {erro && <p className="text-xs text-red-400">{erro}</p>}
      </div>
    </div>
  );
}
