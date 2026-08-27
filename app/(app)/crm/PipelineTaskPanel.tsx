"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

type Task = {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  assignedTo: { id: string; name: string } | null;
};

export function PipelineTaskPanel({
  agentId, conversationId, oppId, pos, onClose, onTasksChange, dark, embedded,
}: {
  agentId: string;
  conversationId: string;
  oppId: string;
  pos?: { top: number; left: number };
  onClose?: () => void;
  onTasksChange: () => void;
  dark: boolean;
  // true = usado como aba dentro de um modal maior (sem casca de popover posicionado)
  embedded?: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendants, setAttendants] = useState<{ id: string; name: string }[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);

  const baseUrl = `/api/ferramentas/whatsapp/conversas/${conversationId}/oportunidades/${oppId}/tarefas`;

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(baseUrl);
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    fetch(`/api/agentes/${agentId}/atendentes`)
      .then(res => res.json())
      .then(data => { if (data.attendants) setAttendants(data.attendants); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), dueDate: newDueDate || null, assignedToId: newAssignedTo || null }),
      });
      setNewTitle(""); setNewDueDate(""); setNewAssignedTo("");
      await load();
      onTasksChange();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(task: Task) {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
    await fetch(`${baseUrl}/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    onTasksChange();
  }

  async function handleDelete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await fetch(`${baseUrl}/${taskId}`, { method: "DELETE" });
    onTasksChange();
  }

  const inputClass = `w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none ${dark ? "bg-gray-950 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const body = (
    <div className={embedded ? "space-y-3" : "space-y-3"}>
        {!embedded && (
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Tarefas</p>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={14} /></button>
          </div>
        )}

        {loading ? (
          <p className="text-xs text-gray-500">Carregando...</p>
        ) : tasks.length === 0 ? (
          <p className="text-xs text-gray-500">Nenhuma tarefa ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {tasks.map(t => {
              const overdue = Boolean(t.dueDate) && !t.done && new Date(t.dueDate!) < today;
              return (
                <div key={t.id} className="group/task flex items-start gap-2">
                  <input type="checkbox" checked={t.done} onChange={() => handleToggle(t)} className="mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs ${t.done ? "line-through text-gray-500" : ""}`}>{t.title}</p>
                    {(t.dueDate || t.assignedTo) && (
                      <p className={`text-[10px] ${overdue ? "text-red-400 font-medium" : "text-gray-500"}`}>
                        {t.dueDate && new Date(t.dueDate).toLocaleDateString("pt-BR")}
                        {t.dueDate && t.assignedTo && " · "}
                        {t.assignedTo?.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="flex-shrink-0 text-gray-600 hover:text-red-400 opacity-0 group-hover/task:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className={`border-t pt-2 space-y-1.5 ${dark ? "border-gray-800" : "border-gray-200"}`}>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Nova tarefa..."
            className={inputClass}
          />
          <div className="flex items-center gap-1.5">
            <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className={inputClass} />
            <select value={newAssignedTo} onChange={e => setNewAssignedTo(e.target.value)} className={inputClass}>
              <option value="">Responsável</option>
              {attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !newTitle.trim()}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-1.5"
          >
            <Plus size={12} /> Adicionar tarefa
          </button>
        </div>
    </div>
  );

  if (embedded) return body;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onPointerDown={e => e.stopPropagation()} />
      <div
        className={`fixed z-50 w-72 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto rounded-xl border shadow-xl p-3 ${dark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
        style={pos}
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        {body}
      </div>
    </>
  );
}
