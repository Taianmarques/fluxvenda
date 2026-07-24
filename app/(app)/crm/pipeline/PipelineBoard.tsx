"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, X, ListFilter } from "lucide-react";
import { WhatsappPipeline, type Stage, type PipelineOpportunity } from "../WhatsappPipeline";
import { type LeadStatus } from "../LeadStatusBadge";
import {
  PipelineFiltersPanel, EMPTY_PIPELINE_FILTERS, hasActivePipelineFilters, applyPipelineFilters,
  type PipelineFilters, type Attendant,
} from "../PipelineFiltersPanel";

type PipelineSummary = { id: string; name: string; order: number; agenteInstrucoes?: string; stages: Stage[] };
type ChatTheme = "dark" | "light";

const THEME_STORAGE_KEY = "whatsapp-chat-theme";

export function PipelineBoard({
  agentId, initialPipelines, initialLeadStatuses, initialOpportunities, initialAutoAvancar,
}: {
  agentId: string;
  initialPipelines: PipelineSummary[];
  initialLeadStatuses: LeadStatus[];
  initialOpportunities: PipelineOpportunity[];
  initialAutoAvancar?: boolean;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<ChatTheme>("dark");
  const [pipelines, setPipelines] = useState(initialPipelines);
  const [activeId, setActiveId] = useState<string | null>(initialPipelines[0]?.id ?? null);
  const [leadStatuses, setLeadStatuses] = useState(initialLeadStatuses);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [filters, setFilters] = useState<PipelineFilters>(EMPTY_PIPELINE_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch(`/api/agentes/${agentId}/atendentes`)
      .then(res => res.json())
      .then(data => { if (data.attendants) setAttendants(data.attendants); })
      .catch(() => {});
  }, [agentId]);

  // Etapas são específicas de cada pipeline — trocar de aba com etapas selecionadas no filtro
  // faria o board parecer vazio (nenhuma oportunidade do pipeline novo bate com IDs do antigo).
  // Os outros filtros (atendente, status, valor, período, busca) continuam valendo pra qualquer aba.
  useEffect(() => {
    setFilters(prev => prev.stageIds.length > 0 ? { ...prev, stageIds: [] } : prev);
  }, [activeId]);

  // Avanço automático: a IA move o lead pelas etapas conforme a conversa evolui
  const [autoAvancar, setAutoAvancar] = useState(initialAutoAvancar ?? false);
  const [salvandoAuto, setSalvandoAuto] = useState(false);

  async function toggleAutoAvancar() {
    const next = !autoAvancar;
    setAutoAvancar(next);
    setSalvandoAuto(true);
    try {
      await fetch(`/api/agentes/${agentId}/modulos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineAutoAvancar: next }),
      });
    } catch {
      setAutoAvancar(!next);
    } finally {
      setSalvandoAuto(false);
    }
  }

  // Agente responsável pelo pipeline (instruções que valem em todas as etapas dele)
  const [showAgente, setShowAgente] = useState(false);
  const [agenteInstrucoes, setAgenteInstrucoes] = useState("");
  const [salvandoAgente, setSalvandoAgente] = useState(false);

  async function salvarAgentePipeline(pipelineId: string) {
    setSalvandoAgente(true);
    try {
      await fetch(`/api/ferramentas/whatsapp/pipelines/${pipelineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agenteInstrucoes: agenteInstrucoes.trim() }),
      });
      setShowAgente(false);
      await refreshPipelines();
    } finally {
      setSalvandoAgente(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  async function refreshPipelines() {
    const res = await fetch(`/api/agentes/${agentId}/pipelines`);
    const data = await res.json();
    if (data.pipelines) setPipelines(data.pipelines);
  }

  async function refreshLeadStatuses() {
    const res = await fetch(`/api/agentes/${agentId}/status`);
    const data = await res.json();
    if (data.statuses) setLeadStatuses(data.statuses);
  }

  async function refreshOpportunities() {
    const res = await fetch(`/api/agentes/${agentId}/oportunidades`);
    const data = await res.json();
    if (data.opportunities) setOpportunities(data.opportunities);
  }

  useEffect(() => {
    const interval = setInterval(refreshOpportunities, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreatePipeline() {
    if (!newPipelineName.trim()) return;
    const res = await fetch(`/api/agentes/${agentId}/pipelines`, {
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

  // Uma oportunidade só aparece em "Sem etapa" se realmente não tiver etapa, ou se a etapa dela
  // for desse pipeline — sem isso, oportunidades de OUTROS pipelines vazavam pra "Sem etapa" aqui.
  const relevantOpportunities = active
    ? applyPipelineFilters(opportunities.filter(o => !o.stageId || active.stages.some(s => s.id === o.stageId)), filters)
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

        {active && (
          <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleAutoAvancar}
            disabled={salvandoAuto}
            title="Com o avanço automático, a IA move o lead pelas etapas conforme a conversa evolui (registrando o motivo numa nota interna)"
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
              autoAvancar
                ? "text-green-400 border-green-800/60 hover:border-green-600"
                : theme === "dark" ? "text-gray-500 border-gray-800 hover:text-gray-300" : "text-gray-500 border-gray-300 hover:text-gray-700"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoAvancar ? "bg-green-400" : "bg-gray-600"}`} />
            Avanço automático {autoAvancar ? "ligado" : "desligado"}
          </button>
          <button
            onClick={() => { setAgenteInstrucoes(active.agenteInstrucoes ?? ""); setShowAgente(s => !s); }}
            title={`Agente responsável pelo pipeline "${active.name}"`}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              (active.agenteInstrucoes ?? "").trim()
                ? "text-blue-400 border-blue-800/60 hover:border-blue-600"
                : theme === "dark" ? "text-gray-500 border-gray-800 hover:text-gray-300" : "text-gray-500 border-gray-300 hover:text-gray-700"
            }`}
          >
            <Bot size={13} />
            {(active.agenteInstrucoes ?? "").trim() ? "Agente do pipeline" : "Definir agente do pipeline"}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowFilters(s => !s)}
              title="Filtros"
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                hasActivePipelineFilters(filters)
                  ? "bg-blue-600 border-blue-600 text-white"
                  : theme === "dark" ? "text-gray-500 border-gray-800 hover:text-gray-300" : "text-gray-500 border-gray-300 hover:text-gray-700"
              }`}
            >
              <ListFilter size={13} />
              Filtros
            </button>
            {showFilters && (
              <PipelineFiltersPanel
                filters={filters}
                onChange={setFilters}
                attendants={attendants}
                leadStatuses={leadStatuses}
                stages={active.stages}
                onClose={() => setShowFilters(false)}
                dark={theme === "dark"}
              />
            )}
          </div>
          </div>
        )}
      </div>

      {showAgente && active && (
        <div className={`mx-4 mt-3 rounded-2xl border p-4 space-y-2 flex-shrink-0 ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-1.5"><Bot size={14} /> Agente responsável pelo pipeline "{active.name}"</p>
            <button onClick={() => setShowAgente(false)} className="text-gray-500 hover:text-gray-300"><X size={15} /></button>
          </div>
          <p className="text-xs text-gray-500">
            Vale para leads em QUALQUER etapa deste pipeline. As instruções configuradas em cada etapa (ícone de robô nas colunas) refinam por cima destas.
          </p>
          <textarea
            value={agenteInstrucoes}
            onChange={e => setAgenteInstrucoes(e.target.value)}
            rows={4}
            maxLength={1500}
            placeholder={`Ex: este funil é de clientes corporativos — trate com formalidade, foque em contratos anuais e sempre direcione para uma reunião com o time comercial.`}
            className={`w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none border ${theme === "dark" ? "bg-gray-950 border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-gray-500">Vazio = comportamento padrão do agente.</p>
            <button
              onClick={() => salvarAgentePipeline(active.id)}
              disabled={salvandoAgente}
              className="text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-4 py-1.5 font-medium"
            >
              {salvandoAgente ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {!active ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Crie um pipeline para começar.</div>
      ) : (
        <WhatsappPipeline
          agentId={agentId}
          pipelineId={active.id}
          stages={active.stages}
          leadStatuses={leadStatuses}
          opportunities={relevantOpportunities}
          theme={theme}
          onSelectConversation={id => router.push(`/crm/${agentId}?c=${id}`)}
          onStagesChange={refreshPipelines}
          onLeadStatusesChange={refreshLeadStatuses}
        />
      )}
    </div>
  );
}
