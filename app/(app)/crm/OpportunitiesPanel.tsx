"use client";

import { useEffect, useRef, useState } from "react";
import { ThumbsUp, Trash2 } from "lucide-react";

export type Opportunity = { id: string; title: string | null; dealValue: number; wonAt: string | null };

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OpportunitiesPanel({
  conversationId, opportunities, onChange, onClose, dark,
}: {
  conversationId: string;
  opportunities: Opportunity[];
  onChange: () => void;
  onClose: () => void;
  dark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function handleCreate() {
    const dealValue = Number(value.replace(",", "."));
    if (!Number.isFinite(dealValue) || dealValue <= 0) return;
    setSaving(true);
    try {
      await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}/oportunidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || null, dealValue }),
      });
      setTitle(""); setValue(""); setShowForm(false);
      onChange();
    } finally {
      setSaving(false);
    }
  }

  async function handleMarcarGanho(oppId: string) {
    const res = await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}/oportunidades/${oppId}/ganho`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Não foi possível marcar como ganho."); return; }
    onChange();
  }

  async function handleDelete(oppId: string) {
    if (!confirm("Excluir essa oportunidade?")) return;
    await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}/oportunidades/${oppId}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div
      ref={ref}
      className={`absolute top-full right-0 mt-1 rounded-xl border shadow-xl z-20 w-72 max-h-96 flex flex-col ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
    >
      <div className={`px-3 py-2 border-b text-xs font-semibold ${dark ? "border-gray-800 text-gray-300" : "border-gray-200 text-gray-600"}`}>
        Oportunidades
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {opportunities.length === 0 && !showForm && (
          <p className={`text-xs p-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Nenhuma oportunidade ainda.</p>
        )}
        {opportunities.map(o => (
          <div key={o.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 ${dark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>{o.title || "Negociação"}</p>
              <p className={`text-xs font-semibold ${o.wonAt ? "text-green-500" : dark ? "text-gray-400" : "text-gray-500"}`}>
                {formatBRL(o.dealValue)}{o.wonAt && " — ganho"}
              </p>
            </div>
            {!o.wonAt && (
              <button
                onClick={() => handleMarcarGanho(o.id)}
                title="Dar ganho"
                className="p-1 rounded-lg bg-green-600 text-white flex-shrink-0"
              >
                <ThumbsUp size={12} />
              </button>
            )}
            <button
              onClick={() => handleDelete(o.id)}
              title="Excluir"
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
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nome (opcional)"
              className={`w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none ${dark ? "bg-gray-950 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"}`}
            />
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              placeholder="Valor, ex: 1500,00"
              className={`w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none ${dark ? "bg-gray-950 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"}`}
            />
            <div className="flex gap-1.5">
              <button onClick={handleCreate} disabled={saving} className="flex-1 text-xs font-medium bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg py-1.5">
                Salvar
              </button>
              <button onClick={() => setShowForm(false)} className={`text-xs px-2 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100"}`}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="text-xs font-medium text-green-500 hover:text-green-400 w-full text-left px-2">
            + Nova oportunidade
          </button>
        )}
      </div>
    </div>
  );
}
