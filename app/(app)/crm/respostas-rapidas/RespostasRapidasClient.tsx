"use client";

import { useState } from "react";
import { MessageSquareText, Plus, Pencil, Trash2, X, Check } from "lucide-react";

type QuickReply = { id: string; title: string; content: string };

export function RespostasRapidasClient({
  agentId, initialQuickReplies,
}: {
  agentId: string;
  initialQuickReplies: QuickReply[];
}) {
  const [quickReplies, setQuickReplies] = useState(initialQuickReplies);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!newTitle.trim() || !newContent.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/agentes/${agentId}/respostas-rapidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error ?? "Não foi possível criar."); return; }
      setQuickReplies(prev => [...prev, data.quickReply]);
      setNewTitle(""); setNewContent(""); setShowCreate(false);
    } finally {
      setCreating(false);
    }
  }

  function startEditing(qr: QuickReply) {
    setEditingId(qr.id);
    setEditTitle(qr.title);
    setEditContent(qr.content);
  }

  async function handleSaveEdit(id: string) {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ferramentas/whatsapp/respostas-rapidas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error ?? "Não foi possível salvar."); return; }
      setQuickReplies(prev => prev.map(qr => qr.id === id ? data.quickReply : qr));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(qr: QuickReply) {
    if (!confirm(`Remover a resposta rápida "${qr.title}"?`)) return;
    await fetch(`/api/ferramentas/whatsapp/respostas-rapidas/${qr.id}`, { method: "DELETE" });
    setQuickReplies(prev => prev.filter(q => q.id !== qr.id));
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <p className="text-gray-400 text-sm">Configurações</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
            <MessageSquareText size={26} className="text-blue-400" /> Mensagens Rápidas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Respostas prontas que qualquer atendente pode usar no chat, pelo ícone de raio ao lado do campo de mensagem.
            Escreva <span className="font-mono text-gray-400">{"{nome}"}</span> em qualquer parte do texto — é trocado
            automaticamente pelo primeiro nome do contato da conversa aberta.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="font-semibold text-sm">Nova resposta rápida</p>
            {!showCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600/50 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus size={12} /> Nova resposta
              </button>
            )}
          </div>

          {showCreate && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 space-y-2">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Nome (ex: Saudação, Horário de funcionamento...)"
                maxLength={40}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Texto da resposta... use {nome} pro nome do cliente"
                rows={3}
                maxLength={2000}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newTitle.trim() || !newContent.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  {creating ? "Criando..." : "Criar"}
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewTitle(""); setNewContent(""); }}
                  className="text-xs text-gray-400 hover:text-gray-200 px-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <p className="font-semibold p-5 pb-3">
            Respostas cadastradas <span className="text-gray-500 font-normal text-sm">({quickReplies.length})</span>
          </p>
          <div className="divide-y divide-gray-800">
            {quickReplies.length === 0 && (
              <p className="text-sm text-gray-500 px-5 py-6 text-center">
                Nenhuma resposta rápida ainda — crie a primeira acima.
              </p>
            )}
            {quickReplies.map(qr => (
              <div key={qr.id} className="px-5 py-3.5">
                {editingId === qr.id ? (
                  <div className="space-y-2">
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      maxLength={40}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(qr.id)}
                        disabled={saving || !editTitle.trim() || !editContent.trim()}
                        className="flex items-center gap-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium"
                      >
                        <Check size={12} /> {saving ? "Salvando..." : "Salvar"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 px-2">
                        <X size={12} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{qr.title}</p>
                      <p className="text-xs text-gray-500 whitespace-pre-wrap mt-0.5">{qr.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEditing(qr)} title="Editar" className="text-gray-500 hover:text-blue-400 p-1.5">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(qr)} title="Excluir" className="text-gray-500 hover:text-red-400 p-1.5">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
