"use client";

import { useState } from "react";
import { MessageSquare, Pencil, Check, X, Loader2 } from "lucide-react";

type Template = {
  id: string;
  label: string;
  description: string;
  body: string;
  placeholders: string[];
};

export function MensagensAdminClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit(t: Template) {
    setEditingId(t.id);
    setDraft(t.body);
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
      setTemplates(prev => prev.map(t => (t.id === id ? { ...t, body: draft.trim() } : t)));
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
        <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare size={24} className="text-blue-400" /> Mensagens automáticas</h1>
        <p className="text-gray-400 text-sm mt-1">
          Textos que a plataforma dispara pelo WhatsApp durante o cadastro e o agendamento de demonstração. Mudanças aqui valem na hora, sem precisar de deploy.
        </p>
      </div>

      <div className="space-y-4">
        {templates.map(t => (
          <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-lg">{t.label}</p>
                <p className="text-xs text-gray-500">{t.description}</p>
              </div>
              {editingId !== t.id && (
                <button onClick={() => startEdit(t)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 flex-shrink-0"><Pencil size={12} /> Editar</button>
              )}
            </div>

            {t.placeholders.length > 0 && (
              <p className="text-xs text-gray-500">
                Placeholders disponíveis:{" "}
                {t.placeholders.map(p => (
                  <code key={p} className="bg-gray-950 border border-gray-800 rounded px-1.5 py-0.5 mr-1 font-mono text-gray-400">{`{{${p}}}`}</code>
                ))}
              </p>
            )}

            {editingId === t.id ? (
              <div className="space-y-2">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={6}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm font-mono resize-y"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => handleSave(t.id)} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                  <button onClick={cancelEdit} className="text-sm text-gray-400 hover:text-white px-3 flex items-center gap-1"><X size={14} /> Cancelar</button>
                </div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 font-sans">{t.body}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
