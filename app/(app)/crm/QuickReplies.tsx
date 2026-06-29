"use client";

import { useEffect, useRef, useState } from "react";

export type QuickReply = { id: string; title: string; content: string };

export function QuickReplies({
  agentId, quickReplies, onSelect, onChange, onClose, dark,
}: {
  agentId: string;
  quickReplies: QuickReply[];
  onSelect: (content: string) => void;
  onChange: () => void;
  onClose: () => void;
  dark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function handleCreate() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/agentes/${agentId}/respostas-rapidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      setTitle(""); setContent(""); setShowForm(false);
      onChange();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover essa resposta rápida?")) return;
    await fetch(`/api/ferramentas/whatsapp/respostas-rapidas/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div
      ref={ref}
      className={`absolute bottom-full left-0 mb-2 rounded-xl border shadow-xl z-10 w-72 max-h-80 flex flex-col ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}
    >
      <div className={`px-3 py-2 border-b text-xs font-semibold ${dark ? "border-gray-800 text-gray-300" : "border-gray-200 text-gray-600"}`}>
        Respostas rápidas
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {quickReplies.length === 0 && !showForm && (
          <p className={`text-xs p-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Nenhuma resposta rápida ainda.</p>
        )}
        {quickReplies.map(qr => (
          <div key={qr.id} className={`group flex items-start gap-1 rounded-lg px-2 py-1.5 ${dark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
            <button onClick={() => onSelect(qr.content)} className="flex-1 text-left">
              <p className={`text-xs font-medium ${dark ? "text-gray-200" : "text-gray-800"}`}>{qr.title}</p>
              <p className={`text-xs truncate ${dark ? "text-gray-500" : "text-gray-400"}`}>{qr.content}</p>
            </button>
            <button
              onClick={() => handleDelete(qr.id)}
              className="text-[10px] text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 px-1 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className={`p-2 border-t ${dark ? "border-gray-800" : "border-gray-200"}`}>
        {showForm ? (
          <div className="space-y-1.5">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nome (ex: Saudação)"
              className={`w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none ${dark ? "bg-gray-950 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"}`}
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Texto da resposta..."
              rows={2}
              className={`w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none resize-none ${dark ? "bg-gray-950 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"}`}
            />
            <div className="flex gap-1.5">
              <button onClick={handleCreate} disabled={saving} className="flex-1 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-1.5">
                Salvar
              </button>
              <button onClick={() => setShowForm(false)} className={`text-xs px-2 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100"}`}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="text-xs font-medium text-blue-400 hover:text-blue-300 w-full text-left px-2">
            + Nova resposta rápida
          </button>
        )}
      </div>
    </div>
  );
}
