"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AGENT_WIZARD_QUESTIONS, DEFAULT_WIZARD_QUESTIONS } from "@/lib/agent-wizard-questions";

function splitLines(v: string) {
  return v.split("\n").map(s => s.trim()).filter(Boolean);
}

export function ConfiguracaoComercialPanel({
  agentId, segmento, initialServicos, initialPrecos, initialObjecoes, initialHorario,
}: {
  agentId: string;
  segmento?: { segmento: string; subsegmento: string };
  initialServicos: string[];
  initialPrecos: string;
  initialObjecoes: string[];
  initialHorario: string;
}) {
  const router = useRouter();
  const q = AGENT_WIZARD_QUESTIONS[segmento?.segmento ?? ""] ?? DEFAULT_WIZARD_QUESTIONS;

  const [servicos, setServicos] = useState(initialServicos.join("\n"));
  const [precos, setPrecos] = useState(initialPrecos);
  const [objecoes, setObjecoes] = useState(initialObjecoes.join("\n"));
  const [horario, setHorario] = useState(initialHorario);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");

  async function handleSuggest() {
    setSuggesting(true);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/sugestao`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setServicos(data.servicos.join("\n"));
      setObjecoes(data.objecoes.join("\n"));
      setHorario(data.horario);
      setSaved(false);
    } catch {
      setError("Não foi possível gerar sugestões agora. Tente novamente.");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicos: splitLines(servicos), precos, objecoes: splitLines(objecoes), horario,
        }),
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
      {segmento?.segmento && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            "Sugerir com IA" preenche serviços, objeções e horário com um ponto de partida típico de {segmento.segmento}
            {segmento.subsegmento && ` > ${segmento.subsegmento}`} — revise antes de salvar.
          </p>
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
          >
            <Sparkles size={13} /> {suggesting ? "Gerando..." : "Sugerir com IA"}
          </button>
        </div>
      )}

      <div>
        <label className="text-sm text-gray-400 block mb-1">{q.servicosLabel}</label>
        <textarea
          value={servicos}
          onChange={e => { setServicos(e.target.value); setSaved(false); }}
          rows={3}
          placeholder={q.servicosPlaceholder}
          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
        />
      </div>
      <div>
        <label className="text-sm text-gray-400 block mb-1">{q.precosLabel}</label>
        <textarea
          value={precos}
          onChange={e => { setPrecos(e.target.value); setSaved(false); }}
          rows={3}
          placeholder={q.precosPlaceholder}
          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
        />
      </div>
      <div>
        <label className="text-sm text-gray-400 block mb-1">{q.objecoesLabel}</label>
        <textarea
          value={objecoes}
          onChange={e => { setObjecoes(e.target.value); setSaved(false); }}
          rows={3}
          placeholder={q.objecoesPlaceholder}
          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
        />
      </div>
      <div>
        <label className="text-sm text-gray-400 block mb-1">Horário de atendimento</label>
        <input
          value={horario}
          onChange={e => { setHorario(e.target.value); setSaved(false); }}
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
