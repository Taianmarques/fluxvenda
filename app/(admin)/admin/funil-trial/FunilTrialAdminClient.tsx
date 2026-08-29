"use client";

import { useState } from "react";
import { Rocket, Clock, Pencil, Check, X, Loader2 } from "lucide-react";

type Step = {
  id: string;
  whenLabel: string;
  label: string;
  description: string;
  body: string;
  placeholders: string[];
};

export function FunilTrialAdminClient({ initialSteps }: { initialSteps: Step[] }) {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit(s: Step) {
    setEditingId(s.id);
    setDraft(s.body);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setError("");
  }

  async function handleSave(id: string) {
    setError("");
    if (!draft.trim()) { setError("A mensagem não pode ficar vazia."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/mensagens/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao salvar mensagem."); return; }
      setSteps(prev => prev.map(s => (s.id === id ? { ...s, body: draft.trim() } : s)));
      setEditingId(null);
    } catch {
      setError("Falha na conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Rocket size={24} className="text-blue-400" /> Funil do teste grátis (CRM)</h1>
        <p className="text-gray-400 text-sm mt-1">
          Sequência de mensagens de WhatsApp disparada durante os 7 dias de teste grátis do CRM, pra reduzir abandono e incentivar o agendamento de demonstração.
          Separado do funil de boas-vindas/cadastro na plataforma. Prazos e condições de cada etapa são fixos no código — só o texto é editável aqui.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map(s => (
          <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-lg">{s.label}</p>
                <p className="text-xs text-gray-500">{s.description}</p>
              </div>
              {editingId !== s.id && (
                <button onClick={() => startEdit(s)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 flex-shrink-0"><Pencil size={12} /> Editar</button>
              )}
            </div>

            <p className="text-xs text-amber-300/80 flex items-center gap-1.5"><Clock size={12} className="flex-shrink-0" /> {s.whenLabel}</p>

            {s.placeholders.length > 0 && (
              <p className="text-xs text-gray-500">
                Placeholders disponíveis:{" "}
                {s.placeholders.map(p => (
                  <code key={p} className="bg-gray-950 border border-gray-800 rounded px-1.5 py-0.5 mr-1 font-mono text-gray-400">{`{{${p}}}`}</code>
                ))}
              </p>
            )}

            {editingId === s.id ? (
              <div className="space-y-2">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={6}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm font-mono resize-y"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => handleSave(s.id)} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                  <button onClick={cancelEdit} className="text-sm text-gray-400 hover:text-white px-3 flex items-center gap-1"><X size={14} /> Cancelar</button>
                </div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 font-sans">{s.body}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
