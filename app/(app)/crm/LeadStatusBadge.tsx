"use client";

import { useRef, useState } from "react";

export type LeadStatus = { id: string; name: string; color: string; order: number };

const PALETTE = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"];

export function LeadStatusBadge({
  agentId, leadStatusId, statuses, onChange, onStatusesChange, dark, compact = false,
}: {
  agentId: string;
  leadStatusId: string | null;
  statuses: LeadStatus[];
  onChange: (id: string | null) => void;
  onStatusesChange: () => void;
  dark: boolean;
  compact?: boolean; // versão menor (card do pipeline): etiqueta mais baixa e menu em posição fixa (o card corta o que sai dele)
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  // Compacto: menu em position:fixed calculado do botão — abre pra cima quando não cabe embaixo
  // (ex: status no rodapé do card) e nunca é cortado pelo overflow-hidden do card
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  function toggle() {
    if (!open && compact && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const altura = 96 + statuses.length * 30;
      const top = r.bottom + 4 + altura > window.innerHeight ? Math.max(8, r.top - 4 - altura) : r.bottom + 4;
      setPos({ top, left: Math.min(Math.max(8, r.left), window.innerWidth - 184) });
    }
    setOpen(o => !o);
  }
  const [newName, setNewName] = useState("");
  const current = statuses.find(s => s.id === leadStatusId) ?? null;

  async function handleCreate() {
    if (!newName.trim()) return;
    const color = PALETTE[statuses.length % PALETTE.length];
    const res = await fetch(`/api/agentes/${agentId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color }),
    });
    const data = await res.json();
    setNewName("");
    onStatusesChange();
    if (data.status) onChange(data.status.id);
    setOpen(false);
  }

  async function handleDeleteTag(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Excluir essa tag de status?")) return;
    await fetch(`/api/ferramentas/whatsapp/status/${id}`, { method: "DELETE" });
    onStatusesChange();
  }

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={toggle}
        className={`${compact ? "text-[9.5px] leading-[14px] px-1.5" : "text-[10px] px-2 py-0.5"} font-medium rounded-full border transition-colors`}
        style={current
          ? { backgroundColor: `${current.color}22`, color: current.color, borderColor: `${current.color}66` }
          : { color: dark ? "#9ca3af" : "#9ca3af", borderColor: dark ? "#374151" : "#d1d5db" }}
      >
        {current ? current.name : "+ status"}
      </button>

      {open && (
        <>
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div
          style={compact && pos ? { top: pos.top, left: pos.left } : undefined}
          className={`${compact ? "fixed z-50" : "absolute z-20 top-full left-0 mt-1"} w-44 rounded-xl border shadow-xl p-1.5 space-y-0.5 ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
          {current && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className={`w-full text-left text-xs px-2 py-1.5 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100"}`}
            >
              Remover status
            </button>
          )}
          {statuses.map(s => (
            <div key={s.id} className={`flex items-center gap-1 rounded-lg ${dark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
              <button
                onClick={() => { onChange(s.id); setOpen(false); }}
                className="flex-1 flex items-center gap-2 text-left text-xs px-2 py-1.5"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="truncate">{s.name}</span>
              </button>
              <button onClick={e => handleDeleteTag(s.id, e)} className="text-gray-500 hover:text-red-400 text-xs px-1.5">✕</button>
            </div>
          ))}
          <div className="flex gap-1 pt-1 border-t mt-1" style={{ borderColor: dark ? "#374151" : "#e5e7eb" }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              placeholder="Nova tag..."
              className={`flex-1 text-xs rounded-lg px-2 py-1 border focus:outline-none ${dark ? "bg-gray-950 border-gray-700 text-white" : "bg-white border-gray-300 text-slate-900"}`}
            />
            <button onClick={handleCreate} className="text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-2">+</button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
