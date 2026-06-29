"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import { SEGMENTS, SUBSEGMENTS } from "@/lib/segments";

export function NovoAgenteCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nome, setNome] = useState("");
  const [segmento, setSegmento] = useState("");
  const [subsegmento, setSubsegmento] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setOpen(false);
    setStep(1);
    setNome("");
    setSegmento("");
    setSubsegmento("");
    setError("");
  }

  async function handleCreate() {
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-gray-900/50 border border-dashed border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 text-gray-500 hover:text-blue-400 hover:border-blue-700 transition-colors"
      >
        <Plus size={26} />
        <p className="text-sm font-medium">Novo agente</p>
      </button>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 md:col-span-2">
      <div className="flex gap-2 text-xs">
        {[1, 2, 3].map(n => (
          <div key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? "bg-blue-500" : "bg-gray-800"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <p className="font-semibold">1. Nome do agente</p>
          <p className="text-sm text-gray-400">Use um nome que ajude a identificar esse agente, ex: "Atendimento — Loja Centro".</p>
          <input
            autoFocus
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === "Enter" && nome.trim() && setStep(2)}
            placeholder="Nome do agente"
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="font-semibold">2. Setor da empresa</p>
          <p className="text-sm text-gray-400">Isso ajuda o agente a conduzir a conversa com boas práticas do seu setor.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SEGMENTS.map(s => (
              <button
                key={s}
                onClick={() => { setSegmento(s); setSubsegmento(""); setStep(3); }}
                className={`text-left p-3 rounded-xl border text-sm ${segmento === s ? "border-blue-600 bg-blue-950/30" : "border-gray-800 hover:border-gray-700"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="font-semibold">3. Subsetor</p>
          <p className="text-sm text-gray-400">Mais um detalhe pra deixar o atendimento ainda mais específico.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(SUBSEGMENTS[segmento] ?? []).map(s => (
              <button
                key={s}
                onClick={() => setSubsegmento(s)}
                className={`text-left p-3 rounded-xl border text-sm ${subsegmento === s ? "border-blue-600 bg-blue-950/30" : "border-gray-800 hover:border-gray-700"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-between pt-2">
        <button
          onClick={() => (step === 1 ? reset() : setStep((step - 1) as 1 | 2))}
          className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1"
        >
          {step === 1 ? "Cancelar" : <><ArrowLeft size={14} /> Voltar</>}
        </button>
        {step === 1 && (
          <button onClick={() => nome.trim() && setStep(2)} disabled={!nome.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
            Continuar
          </button>
        )}
        {step === 3 && (
          <button onClick={handleCreate} disabled={saving || !subsegmento} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
            {saving ? "Criando agente..." : "Criar agente"}
          </button>
        )}
      </div>
    </div>
  );
}
