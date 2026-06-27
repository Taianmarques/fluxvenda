"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WhatsappPipeline, type Stage, type PipelineConversation } from "../WhatsappPipeline";
import { type LeadStatus } from "../LeadStatusBadge";

type PipelineSummary = { id: string; name: string; order: number; stages: Stage[] };
type ChatTheme = "dark" | "light";

const THEME_STORAGE_KEY = "whatsapp-chat-theme";

export function PipelineBoard({
  initialPipelines, initialLeadStatuses, initialConversations,
}: {
  initialPipelines: PipelineSummary[];
  initialLeadStatuses: LeadStatus[];
  initialConversations: PipelineConversation[];
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<ChatTheme>("dark");
  const [pipelines, setPipelines] = useState(initialPipelines);
  const [activeId, setActiveId] = useState<string | null>(initialPipelines[0]?.id ?? null);
  const [leadStatuses, setLeadStatuses] = useState(initialLeadStatuses);
  const [conversations, setConversations] = useState(initialConversations);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  async function refreshPipelines() {
    const res = await fetch("/api/ferramentas/whatsapp/pipelines");
    const data = await res.json();
    if (data.pipelines) setPipelines(data.pipelines);
  }

  async function refreshLeadStatuses() {
    const res = await fetch("/api/ferramentas/whatsapp/status");
    const data = await res.json();
    if (data.statuses) setLeadStatuses(data.statuses);
  }

  async function refreshConversations() {
    const res = await fetch("/api/ferramentas/whatsapp/conversas");
    const data = await res.json();
    if (data.conversations) {
      setConversations(data.conversations.map((c: any) => ({
        id: c.id, contactName: c.contactName, contactNumber: c.contactNumber,
        stageId: c.stageId, leadStatusId: c.leadStatusId, dealValue: c.dealValue, updatedAt: c.updatedAt,
        lastMessage: c.messages[0]?.content ?? null,
      })));
    }
  }

  useEffect(() => {
    const interval = setInterval(refreshConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreatePipeline() {
    if (!newPipelineName.trim()) return;
    const res = await fetch("/api/ferramentas/whatsapp/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPipelineName.trim() }),
    });
    const data = await res.json();
    setNewPipelineName("");
    setShowNewPipeline(false);
    await refreshPipelines();
    if (data.pipeline) setActiveId(data.pipeline.id);
  }

  async function handleRenamePipeline(id: string) {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    await fetch(`/api/ferramentas/whatsapp/pipelines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    setRenamingId(null);
    await refreshPipelines();
  }

  async function handleDeletePipeline(id: string) {
    if (pipelines.length <= 1) return;
    if (!confirm("Excluir esse pipeline e suas etapas? As conversas dele ficam sem etapa.")) return;
    await fetch(`/api/ferramentas/whatsapp/pipelines/${id}`, { method: "DELETE" });
    if (activeId === id) setActiveId(pipelines.find(p => p.id !== id)?.id ?? null);
    await refreshPipelines();
  }

  const active = pipelines.find(p => p.id === activeId) ?? pipelines[0] ?? null;

  // Uma conversa só aparece em "Sem etapa" se realmente não tiver etapa, ou se a etapa dela
  // for desse pipeline — sem isso, conversas de OUTROS pipelines vazavam pra "Sem etapa" aqui.
  const relevantConversations = active
    ? conversations.filter(c => !c.stageId || active.stages.some(s => s.id === c.stageId))
    : [];

  return (
    <div className={`h-full flex flex-col ${theme === "dark" ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2 flex-shrink-0 ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-1 flex-wrap">
          {pipelines.map(p => (
            <div key={p.id} className="flex items-center">
              {renamingId === p.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => handleRenamePipeline(p.id)}
                  onKeyDown={e => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                  className={`text-sm px-3 py-1.5 rounded-lg border ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-300"}`}
                />
              ) : (
                <button
                  onClick={() => setActiveId(p.id)}
                  onDoubleClick={() => { setRenamingId(p.id); setRenameValue(p.name); }}
                  title="Clique duplo para renomear"
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    p.id === active?.id
                      ? theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900 shadow-sm"
                      : theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {p.name}
                </button>
              )}
              {p.id === active?.id && pipelines.length > 1 && (
                <button onClick={() => handleDeletePipeline(p.id)} className="text-gray-500 hover:text-red-400 text-xs px-1.5" title="Excluir pipeline">✕</button>
              )}
            </div>
          ))}

          {showNewPipeline ? (
            <input
              autoFocus
              value={newPipelineName}
              onChange={e => setNewPipelineName(e.target.value)}
              onBlur={() => !newPipelineName.trim() && setShowNewPipeline(false)}
              onKeyDown={e => e.key === "Enter" && handleCreatePipeline()}
              placeholder="Nome do pipeline..."
              className={`text-sm px-3 py-1.5 rounded-lg border ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-300"}`}
            />
          ) : (
            <button onClick={() => setShowNewPipeline(true)} className="text-sm font-medium px-3 py-1.5 rounded-lg text-blue-400 hover:text-blue-300">
              + Novo pipeline
            </button>
          )}
        </div>
      </div>

      {!active ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Crie um pipeline para começar.</div>
      ) : (
        <WhatsappPipeline
          pipelineId={active.id}
          stages={active.stages}
          leadStatuses={leadStatuses}
          conversations={relevantConversations}
          theme={theme}
          onSelectConversation={id => router.push(`/crm?c=${id}`)}
          onStagesChange={refreshPipelines}
          onLeadStatusesChange={refreshLeadStatuses}
        />
      )}
    </div>
  );
}
