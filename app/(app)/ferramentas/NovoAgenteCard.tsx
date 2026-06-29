"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SEGMENTS, SUBSEGMENTS } from "@/lib/segments";

export function NovoAgenteCard() {
  const router = useRouter();
  const [segmento, setSegmento] = useState("");
  const [subsegmento, setSubsegmento] = useState("");
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const step: "segmento" | "subsegmento" | "nome" = !segmento ? "segmento" : !subsegmento ? "subsegmento" : "nome";

  async function handleCreate() {
    if (!nome.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/agentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), segmento, subsegmento }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      router.push(`/ferramentas/whatsapp/${data.config.id}`);
    } catch {
      setError("Não foi possível criar o agente. Tente novamente.");
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <div>
        <p className="font-semibold text-lg">Criar agente novo</p>
        <p className="text-sm text-gray-400 mt-0.5">Escolha o setor pra começar — as perguntas e sugestões da configuração já vêm adaptadas pra ele.</p>
      </div>

      {step === "segmento" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SEGMENTS.map(s => (
            <button
              key={s}
              onClick={() => setSegmento(s)}
              className="text-left p-3 rounded-xl border border-gray-800 hover:border-blue-600 hover:bg-blue-950/30 text-sm font-medium transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {step === "subsegmento" && (
        <div className="space-y-3">
          <button onClick={() => setSegmento("")} className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1">
            <ArrowLeft size={14} /> Voltar
          </button>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(SUBSEGMENTS[segmento] ?? []).map(s => (
              <button
                key={s}
                onClick={() => setSubsegmento(s)}
                className="text-left p-3 rounded-xl border border-gray-800 hover:border-blue-600 hover:bg-blue-950/30 text-sm transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "nome" && (
        <div className="space-y-3">
          <button onClick={() => setSubsegmento("")} className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1">
            <ArrowLeft size={14} /> Voltar
          </button>
          <p className="text-sm text-gray-400">{segmento} · {subsegmento}</p>
          <input
            autoFocus
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="Nome do agente"
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button onClick={handleCreate} disabled={saving || !nome.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
            {saving ? "Criando agente..." : "Criar agente"}
          </button>
        </div>
      )}
    </div>
  );
}
