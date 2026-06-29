"use client";

import { useState } from "react";
import { Users } from "lucide-react";

const MODES = [
  { value: "MANUAL", label: "Manual", description: "Ninguém é atribuído automaticamente — o gestor ou o próprio atendente escolhem quem fica com cada conversa." },
  { value: "PRIMEIRO_A_ASSUMIR", label: "Primeiro a assumir", description: "Quem mandar a primeira mensagem manual numa conversa fica responsável por ela." },
  { value: "RODIZIO", label: "Rodízio", description: "Toda conversa nova já nasce atribuída automaticamente, alternando entre os atendentes da equipe." },
  { value: "IA_QUALIFICACAO", label: "IA qualifica antes de atribuir", description: "A IA analisa a conversa e só atribui (em rodízio) quando o cliente demonstrar interesse real de compra." },
];

export function DistribuicaoClient({ agentId, initialMode }: { agentId: string; initialMode: string }) {
  const [mode, setMode] = useState(initialMode);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(value: string) {
    setMode(value);
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/agentes/${agentId}/distribuicao`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadDistributionMode: value }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold flex items-center gap-2"><Users size={16} /> Distribuição de leads entre atendentes</p>
        {saving ? <span className="text-xs text-gray-500">Salvando...</span> : saved ? <span className="text-xs text-green-400">Salvo</span> : null}
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {MODES.map(m => (
          <button
            key={m.value}
            onClick={() => handleSave(m.value)}
            className={`text-left p-3 rounded-xl border text-sm transition-colors ${
              mode === m.value ? "border-blue-600 bg-blue-950/30" : "border-gray-800 hover:border-gray-700"
            }`}
          >
            <p className="font-medium">{m.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
