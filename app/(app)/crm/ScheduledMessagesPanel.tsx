"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

export type ScheduledMessage = { id: string; content: string; scheduledFor: string; createdBy?: { name: string } | null };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function ScheduledMessagesPanel({
  conversationId, scheduledMessages, onChange, onClose, dark,
}: {
  conversationId: string;
  scheduledMessages: ScheduledMessage[];
  onChange: () => void;
  onClose: () => void;
  dark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [when, setWhen] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function handleCreate() {
    if (!content.trim() || !when) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}/envios-agendados`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), scheduledFor: new Date(when).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Não foi possível agendar."); return; }
      setContent(""); setWhen(""); setShowForm(false);
      onChange();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Cancelar esse envio agendado?")) return;
    await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}/envios-agendados/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div
      ref={ref}
      className={`max-md:fixed max-md:inset-x-3 max-md:top-28 md:absolute md:top-full md:right-0 md:mt-1 md:w-80 rounded-xl border shadow-xl z-30 max-h-96 flex flex-col ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
    >
      <div className={`px-3 py-2 border-b text-xs font-semibold ${dark ? "border-gray-800 text-gray-300" : "border-gray-200 text-gray-600"}`}>
        Agendar envio
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {scheduledMessages.length === 0 && !showForm && (
          <p className={`text-xs p-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Nenhum envio agendado.</p>
        )}
        {scheduledMessages.map(s => (
          <div key={s.id} className={`group flex items-start gap-1 rounded-lg px-2 py-1.5 ${dark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${dark ? "text-blue-400" : "text-blue-600"}`}>{formatDateTime(s.scheduledFor)}</p>
              <p className={`text-xs truncate ${dark ? "text-gray-400" : "text-gray-500"}`}>{s.content}</p>
            </div>
            <button
              onClick={() => handleDelete(s.id)}
              title="Cancelar"
              className="text-gray-500 hover:text-red-400 p-1 flex-shrink-0 opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className={`p-2 border-t ${dark ? "border-gray-800" : "border-gray-200"}`}>
        {showForm ? (
          <div className="space-y-1.5">
            {error && <p className="text-xs text-red-400">{error}</p>}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Texto da mensagem..."
              rows={2}
              className={`w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none resize-none ${dark ? "bg-gray-950 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"}`}
            />
            <input
              type="datetime-local"
              value={when}
              onChange={e => setWhen(e.target.value)}
              className={`w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none ${dark ? "bg-gray-950 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
            />
            <div className="flex gap-1.5">
              <button onClick={handleCreate} disabled={saving} className="flex-1 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-1.5">
                Agendar
              </button>
              <button onClick={() => setShowForm(false)} className={`text-xs px-2 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100"}`}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="text-xs font-medium text-blue-400 hover:text-blue-300 w-full text-left px-2">
            + Agendar envio
          </button>
        )}
      </div>
    </div>
  );
}
