"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ThumbsUp, ThumbsDown, MessageCircle, ListChecks, Paperclip, StickyNote, Trash2, Download, ExternalLink } from "lucide-react";
import { ConversationThread } from "./ConversationThread";
import { PipelineTaskPanel } from "./PipelineTaskPanel";
import type { PipelineOpportunity, Stage } from "./WhatsappPipeline";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

type Tab = "conversa" | "tarefas" | "arquivos" | "anotacoes";
const TABS: { key: Tab; label: string; icon: typeof MessageCircle }[] = [
  { key: "conversa", label: "Conversa", icon: MessageCircle },
  { key: "tarefas", label: "Tarefas", icon: ListChecks },
  { key: "arquivos", label: "Arquivos", icon: Paperclip },
  { key: "anotacoes", label: "Anotações", icon: StickyNote },
];

// Modal de detalhes da oportunidade, aberto pelo ícone "Detalhes" do card ou clicando no
// próprio card no Kanban — reúne conversa, tarefas, arquivos e anotações sobre o cliente,
// junto com um resumo do negócio e os atalhos de Ganhar/Perder que já existem no menu do
// card. Ganhar/Perder/editar valor reaproveitam os mesmos handlers/estado de
// WhatsappPipeline.tsx (o modal de motivo de perda já existente aparece por cima ao clicar
// em "Perder", sem duplicar essa lógica aqui).
export function OpportunityDetailModal({
  agentId, opp, stages, dark, onClose, onValueChange, onMarcarGanho, onMarcarPerda, onOpportunitiesChange,
}: {
  agentId: string;
  opp: PipelineOpportunity;
  stages: Stage[];
  dark: boolean;
  onClose: () => void;
  onValueChange: (id: string, value: number) => void;
  onMarcarGanho: (id: string) => void;
  onMarcarPerda: (id: string) => void;
  onOpportunitiesChange: () => void;
}) {
  const [tab, setTab] = useState<Tab>("conversa");
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(opp.dealValue));
  const closed = Boolean(opp.wonAt || opp.lostAt);

  const orderedStages = [...stages].sort((a, b) => a.order - b.order);
  const currentIndex = orderedStages.findIndex(s => s.id === opp.stageId);

  function commitValue() {
    setEditingValue(false);
    const parsed = Number(valueInput.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0 && parsed !== opp.dealValue) onValueChange(opp.id, parsed);
    else setValueInput(String(opp.dealValue));
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-4xl h-[70vh] rounded-2xl border flex flex-col overflow-hidden ${dark ? "bg-gray-950 border-gray-800 text-white" : "bg-white border-gray-200 text-slate-900"}`}
      >
        <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 flex-shrink-0 ${dark ? "border-gray-800" : "border-gray-200"}`}>
          <p className="font-semibold truncate">{opp.contactName || opp.contactNumber}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Link
              href={`/crm/${agentId}?c=${opp.conversationId}`}
              title="Ir para conversa"
              className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 ${dark ? "text-blue-400 hover:bg-gray-800" : "text-blue-600 hover:bg-gray-100"}`}
            >
              <ExternalLink size={14} /> Ir para conversa
            </Link>
            <button onClick={onClose} className={`p-1.5 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100"}`}>
              <X size={18} />
            </button>
          </div>
        </div>

        {orderedStages.length > 0 && (
          <div className={`flex items-stretch overflow-x-auto flex-shrink-0 border-b ${dark ? "border-gray-800" : "border-gray-200"}`}>
            {orderedStages.map((s, i) => {
              const done = currentIndex >= 0 && i < currentIndex;
              const current = s.id === opp.stageId;
              return (
                <div
                  key={s.id}
                  className={`flex-1 min-w-[110px] text-center text-[11px] font-semibold uppercase tracking-wide py-2.5 px-2 truncate ${
                    current ? "bg-blue-600 text-white" : done ? (dark ? "bg-blue-950/40 text-blue-300" : "bg-blue-50 text-blue-600") : dark ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  {done && "✓ "}{s.name}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className={`w-60 flex-shrink-0 overflow-y-auto p-4 space-y-4 border-r ${dark ? "border-gray-800" : "border-gray-200"}`}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Dados lead</p>
              <p className="text-sm font-medium truncate">{opp.contactName || "Sem nome"}</p>
              <p className="text-xs text-gray-500">{opp.contactNumber}</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Negócio</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Valor</span>
                  {editingValue ? (
                    <input
                      autoFocus
                      value={valueInput}
                      onChange={e => setValueInput(e.target.value)}
                      onBlur={commitValue}
                      onKeyDown={e => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                      className={`w-24 text-right rounded px-1.5 py-0.5 border focus:outline-none ${dark ? "bg-gray-900 border-gray-700 text-green-300" : "bg-white border-gray-300 text-green-700"}`}
                    />
                  ) : (
                    <button
                      onClick={() => !closed && setEditingValue(true)}
                      disabled={closed}
                      className={`font-semibold ${opp.lostAt ? "text-gray-500 line-through" : "text-green-500"} ${!closed ? "cursor-text" : ""}`}
                    >
                      {formatBRL(opp.dealValue)}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Responsável</span>
                  <span className="truncate">{opp.assignedToName ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Dias etapa atual</span>
                  <span>{daysSince(opp.stageEnteredAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Dias aberto</span>
                  <span>{daysSince(opp.createdAt)}</span>
                </div>
              </div>
            </div>

            {!closed ? (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onMarcarGanho(opp.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg py-2 text-xs font-medium"
                >
                  <ThumbsUp size={13} /> Ganhar
                </button>
                <button
                  onClick={() => onMarcarPerda(opp.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg py-2 text-xs font-medium"
                >
                  <ThumbsDown size={13} /> Perder
                </button>
              </div>
            ) : (
              <p className={`text-xs font-semibold ${opp.wonAt ? "text-green-500" : "text-red-400"}`}>
                {opp.wonAt ? "🏆 Ganho" : `Perdida${opp.motivoPerdaNome ? ` — ${opp.motivoPerdaNome}` : ""}`}
              </p>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className={`flex items-center border-b flex-shrink-0 overflow-x-auto ${dark ? "border-gray-800" : "border-gray-200"}`}>
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 flex-shrink-0 transition-colors ${
                    tab === key ? "border-blue-500 text-blue-400" : `border-transparent ${dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {tab === "conversa" && <ConversationThread conversationId={opp.conversationId} dark={dark} showHeader={false} />}
              {tab === "tarefas" && (
                <div className="h-full overflow-y-auto p-4">
                  <PipelineTaskPanel embedded agentId={agentId} conversationId={opp.conversationId} oppId={opp.id} onTasksChange={onOpportunitiesChange} dark={dark} />
                </div>
              )}
              {tab === "arquivos" && <OpportunityFilesTab conversationId={opp.conversationId} oppId={opp.id} dark={dark} />}
              {tab === "anotacoes" && <OpportunityNotesTab conversationId={opp.conversationId} dark={dark} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type OppFile = { id: string; fileName: string; mimeType: string; createdAt: string; uploadedBy: { name: string } | null };

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function OpportunityFilesTab({ conversationId, oppId, dark }: { conversationId: string; oppId: string; dark: boolean }) {
  const [files, setFiles] = useState<OppFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const baseUrl = `/api/ferramentas/whatsapp/conversas/${conversationId}/oportunidades/${oppId}/arquivos`;

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(baseUrl);
      const data = await res.json();
      setFiles(data.files ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(file: File) {
    setError("");
    if (file.size > MAX_FILE_BYTES) { setError("Arquivo muito grande — o limite é 5MB."); return; }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/octet-stream", base64 }),
      });
      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) { setError(data.error ?? "Não foi possível enviar o arquivo."); return; }
      await load();
    } catch {
      setError("Não foi possível ler o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string) {
    if (!confirm("Excluir esse arquivo?")) return;
    setFiles(prev => prev.filter(f => f.id !== fileId));
    await fetch(`${baseUrl}/${fileId}`, { method: "DELETE" });
  }

  async function handleDownload(f: OppFile) {
    const res = await fetch(`${baseUrl}/${f.id}`);
    const data = await res.json().catch(() => ({} as { file?: { base64: string; mimeType: string; fileName: string } }));
    if (!data.file) return;
    const a = document.createElement("a");
    a.href = `data:${data.file.mimeType};base64,${data.file.base64}`;
    a.download = data.file.fileName;
    a.click();
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <label
        className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-4 text-xs cursor-pointer ${uploading ? "opacity-50" : ""} ${dark ? "border-gray-800 hover:border-gray-700 text-gray-400" : "border-gray-300 hover:border-gray-400 text-gray-500"}`}
      >
        <Paperclip size={14} /> {uploading ? "Enviando..." : "Clique pra anexar um arquivo (até 5MB)"}
        <input
          type="file"
          className="hidden"
          disabled={uploading}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
        />
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {loading ? (
        <p className="text-xs text-gray-500">Carregando...</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhum arquivo ainda — não é enviado ao cliente, só fica visível pra equipe.</p>
      ) : (
        <div className="space-y-1.5">
          {files.map(f => (
            <div key={f.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${dark ? "bg-gray-900 border border-gray-800" : "bg-gray-50 border border-gray-200"}`}>
              <Paperclip size={13} className="flex-shrink-0 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{f.fileName}</p>
                <p className="text-[10px] text-gray-500">{f.uploadedBy?.name ?? "Atendente"} · {new Date(f.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
              <button onClick={() => handleDownload(f)} title="Baixar" className="text-gray-500 hover:text-blue-400 p-1 flex-shrink-0"><Download size={13} /></button>
              <button onClick={() => handleDelete(f.id)} title="Excluir" className="text-gray-500 hover:text-red-400 p-1 flex-shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type NoteMessage = { id: string; content: string; createdAt: string; sender?: { name: string } | null };

function OpportunityNotesTab({ conversationId, dark }: { conversationId: string; dark: boolean }) {
  const [notes, setNotes] = useState<NoteMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}`);
      const data = await res.json();
      const msgs: NoteMessage[] = (data.conversation?.messages ?? []).filter((m: { role: string }) => m.role === "note");
      setNotes(msgs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!input.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}/nota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      setInput("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <p className="text-xs text-gray-500">Carregando...</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-gray-500">Nenhuma anotação ainda.</p>
        ) : (
          notes.map(n => (
            <div key={n.id} className="rounded-lg px-3 py-2 text-sm bg-amber-900/30 border border-amber-800/40 text-amber-100">
              <p className="text-[10px] opacity-80 mb-0.5 flex items-center gap-1 text-amber-300">
                <StickyNote size={10} /> {n.sender?.name ?? "Atendente"} · {new Date(n.createdAt).toLocaleString("pt-BR")}
              </p>
              <p className="whitespace-pre-wrap">{n.content}</p>
            </div>
          ))
        )}
      </div>
      <div className={`p-3 border-t flex items-center gap-2 flex-shrink-0 ${dark ? "border-gray-800" : "border-gray-200"}`}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSave()}
          placeholder="Escreva uma anotação sobre esse cliente..."
          className={`flex-1 text-sm rounded-xl px-3 py-2 border focus:outline-none ${dark ? "bg-gray-900 border-gray-800 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-slate-900 placeholder:text-gray-400"}`}
        />
        <button onClick={handleSave} disabled={saving || !input.trim()} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-full px-4 py-2 text-sm font-medium text-white flex-shrink-0">
          Salvar
        </button>
      </div>
    </div>
  );
}
