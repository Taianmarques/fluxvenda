"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TOM_OPTIONS = [
  { value: "FORMAL", label: "Formal", description: "Protocolar, direto ao ponto" },
  { value: "PROXIMO", label: "Próximo", description: "Descontraído e caloroso" },
  { value: "CONSULTIVO", label: "Consultivo", description: "Atencioso, entende antes de oferecer" },
];

export function PersonalidadePanel({
  agentId, initialNome, initialTom,
}: {
  agentId: string;
  initialNome: string;
  initialTom: string;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(initialNome);
  const [tom, setTom] = useState(initialTom);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, tom }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      router.refresh();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
      <div>
        <label className="text-sm text-gray-400 block mb-1">Nome do agente</label>
        <input
          value={nome}
          onChange={e => { setNome(e.target.value); setSaved(false); }}
          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-2">Tom de voz</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TOM_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => { setTom(o.value); setSaved(false); }}
              className={`text-left p-3 rounded-xl border text-sm ${tom === o.value ? "border-blue-600 bg-blue-950/30" : "border-gray-800 hover:border-gray-700"}`}
            >
              <p className="font-medium">{o.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{o.description}</p>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={saving || !nome.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-medium">
          {saving ? "Salvando..." : "Salvar"}
        </button>
        {saved && <span className="text-sm text-green-400">Salvo!</span>}
      </div>
    </div>
  );
}
