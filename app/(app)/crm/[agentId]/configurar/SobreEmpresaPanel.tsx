"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AGENT_WIZARD_QUESTIONS, DEFAULT_WIZARD_QUESTIONS } from "@/lib/agent-wizard-questions";

export function SobreEmpresaPanel({
  agentId, segmento, initialDescricaoEmpresa, initialEnderecoContato,
}: {
  agentId: string;
  segmento?: { segmento: string; subsegmento: string };
  initialDescricaoEmpresa: string;
  initialEnderecoContato: string;
}) {
  const router = useRouter();
  const q = AGENT_WIZARD_QUESTIONS[segmento?.segmento ?? ""] ?? DEFAULT_WIZARD_QUESTIONS;

  const [descricaoEmpresa, setDescricaoEmpresa] = useState(initialDescricaoEmpresa);
  const [enderecoContato, setEnderecoContato] = useState(initialEnderecoContato);
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
        body: JSON.stringify({ descricaoEmpresa, enderecoContato }),
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
      <p className="text-sm text-gray-400">Quanto mais detalhes você der aqui, mais o agente vai saber responder sem inventar nada.</p>

      <div>
        <label className="text-sm text-gray-400 block mb-1">{q.descricaoEmpresaLabel}</label>
        <textarea
          value={descricaoEmpresa}
          onChange={e => { setDescricaoEmpresa(e.target.value); setSaved(false); }}
          rows={5}
          placeholder={q.descricaoEmpresaPlaceholder}
          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Endereço, site e redes sociais</label>
        <textarea
          value={enderecoContato}
          onChange={e => { setEnderecoContato(e.target.value); setSaved(false); }}
          rows={3}
          placeholder="Endereço físico, site, Instagram, outros canais de atendimento..."
          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-medium">
          {saving ? "Salvando..." : "Salvar"}
        </button>
        {saved && <span className="text-sm text-green-400">Salvo!</span>}
      </div>
    </div>
  );
}
