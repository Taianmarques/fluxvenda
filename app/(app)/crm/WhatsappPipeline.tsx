"use client";

import { useEffect, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { ThumbsUp, MessageCircle } from "lucide-react";
import { LeadStatusBadge, type LeadStatus } from "./LeadStatusBadge";
import { ConversationPopup } from "./ConversationPopup";

export type Stage = { id: string; name: string; color: string; order: number };
export type PipelineOpportunity = {
  id: string;
  conversationId: string;
  contactName: string | null;
  contactNumber: string;
  leadStatusId: string | null;
  assignedToName: string | null;
  title: string | null;
  stageId: string | null;
  dealValue: number;
  wonAt: string | null;
  createdAt: string;
  stageEnteredAt: string;
  lastMessage: string | null;
  updatedAt: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
type PipelineTheme = "dark" | "light";

const PIPELINE_THEMES = {
  dark: {
    card: "bg-gray-900 border-gray-800 hover:border-gray-600",
    cardSecondary: "text-gray-500",
    column: "bg-gray-950/50 border-gray-800",
    columnHeaderBorder: "border-gray-800",
    columnCount: "text-gray-500",
    input: "bg-gray-950 border-gray-700 text-green-300",
    nameInput: "bg-gray-900 border-gray-700",
    addInput: "bg-gray-900 border-gray-800 text-white placeholder:text-gray-500",
    overlay: "bg-gray-900 border-blue-600",
  },
  light: {
    card: "bg-white border-gray-200 hover:border-gray-400",
    cardSecondary: "text-gray-500",
    column: "bg-gray-100 border-gray-200",
    columnHeaderBorder: "border-gray-200",
    columnCount: "text-gray-500",
    input: "bg-white border-gray-300 text-green-700",
    nameInput: "bg-white border-gray-300",
    addInput: "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400",
    overlay: "bg-white border-blue-500",
  },
} satisfies Record<PipelineTheme, Record<string, string>>;

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Card({
  opp, onClick, onValueChange, onLeadStatusChange, onMarcarGanho, onOpenChat, leadStatuses, onLeadStatusesChange, dark, t,
}: {
  opp: PipelineOpportunity;
  onClick: () => void;
  onValueChange: (id: string, value: number) => void;
  onLeadStatusChange: (conversationId: string, leadStatusId: string | null) => void;
  onMarcarGanho: (id: string) => void;
  onOpenChat: (conversationId: string) => void;
  leadStatuses: LeadStatus[];
  onLeadStatusesChange: () => void;
  dark: boolean;
  t: typeof PIPELINE_THEMES.dark;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: opp.id });
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(opp.dealValue));

  function commitValue() {
    setEditingValue(false);
    const parsed = Number(valueInput.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0 && parsed !== opp.dealValue) onValueChange(opp.id, parsed);
    else setValueInput(String(opp.dealValue));
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`border rounded-xl p-3 cursor-pointer transition-colors ${t.card} ${isDragging ? "opacity-30" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm truncate flex-1">{opp.contactName || opp.contactNumber}</p>
        <button
          onClick={e => { e.stopPropagation(); onOpenChat(opp.conversationId); }}
          onPointerDown={e => e.stopPropagation()}
          title="Abrir conversa"
          className={`p-1 rounded flex-shrink-0 ${dark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
        >
          <MessageCircle size={14} />
        </button>
        <LeadStatusBadge
          leadStatusId={opp.leadStatusId}
          statuses={leadStatuses}
          onChange={id => onLeadStatusChange(opp.conversationId, id)}
          onStatusesChange={onLeadStatusesChange}
          dark={dark}
        />
      </div>
      <p className={`text-xs truncate mt-1 ${t.cardSecondary}`}>{opp.title || opp.lastMessage || "—"}</p>
      <div className={`flex items-center justify-between gap-2 mt-1.5 text-[10px] ${t.cardSecondary}`}>
        <span>Aberta em {formatDate(opp.createdAt)}</span>
        <span className={daysSince(opp.stageEnteredAt) >= 7 ? "text-amber-500 font-medium" : ""}>
          {daysSince(opp.stageEnteredAt)}d nessa etapa
        </span>
      </div>
      {opp.assignedToName && (
        <p className={`text-[10px] mt-0.5 truncate ${t.cardSecondary}`}>Vendedor: {opp.assignedToName}</p>
      )}
      {editingValue ? (
        <input
          autoFocus
          value={valueInput}
          onClick={e => e.stopPropagation()}
          onChange={e => setValueInput(e.target.value)}
          onBlur={commitValue}
          onKeyDown={e => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          onPointerDown={e => e.stopPropagation()}
          placeholder="0,00"
          className={`w-full mt-2 border rounded px-2 py-1 text-xs ${t.input}`}
        />
      ) : (
        <div className="flex items-center justify-between gap-2 mt-2">
          <p
            className="text-xs font-semibold cursor-text text-green-500"
            onClick={e => { e.stopPropagation(); setEditingValue(true); }}
            onPointerDown={e => e.stopPropagation()}
          >
            {opp.wonAt ? `🏆 ${formatBRL(opp.dealValue)}` : formatBRL(opp.dealValue)}
          </p>
          {!opp.wonAt && (
            <button
              onClick={e => { e.stopPropagation(); onMarcarGanho(opp.id); }}
              onPointerDown={e => e.stopPropagation()}
              title="Marcar como ganho"
              className="p-1 rounded bg-green-900/40 text-green-300 border border-green-800/50 hover:bg-green-900/70 flex-shrink-0"
            >
              <ThumbsUp size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Column({
  stage, opportunities, onClickCard, onRename, onDelete, onValueChange, onLeadStatusChange, onMarcarGanho, onOpenChat, leadStatuses, onLeadStatusesChange, dark, t,
}: {
  stage: Stage;
  opportunities: PipelineOpportunity[];
  onClickCard: (conversationId: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onValueChange: (id: string, value: number) => void;
  onLeadStatusChange: (conversationId: string, leadStatusId: string | null) => void;
  onMarcarGanho: (id: string) => void;
  onOpenChat: (conversationId: string) => void;
  leadStatuses: LeadStatus[];
  onLeadStatusesChange: () => void;
  dark: boolean;
  t: typeof PIPELINE_THEMES.dark;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);

  const total = opportunities.reduce((sum, o) => sum + o.dealValue, 0);

  return (
    <div ref={setNodeRef} className={`w-72 flex-shrink-0 flex flex-col rounded-2xl border ${isOver ? "border-blue-500" : t.column}`}>
      <div className={`p-3 border-b ${t.columnHeaderBorder}`}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => { setEditing(false); if (name.trim() && name !== stage.name) onRename(stage.id, name.trim()); }}
              onKeyDown={e => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              className={`flex-1 border rounded px-2 py-0.5 text-sm ${t.nameInput}`}
            />
          ) : (
            <p className="flex-1 font-medium text-sm truncate cursor-text" onClick={() => setEditing(true)}>{stage.name}</p>
          )}
          <span className={`text-xs ${t.columnCount}`}>{opportunities.length}</span>
          <button onClick={() => onDelete(stage.id)} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
        </div>
        {total > 0 && <p className="text-xs font-semibold text-green-500 mt-1.5">{formatBRL(total)}</p>}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {opportunities.map(o => (
          <Card
            key={o.id} opp={o} onClick={() => onClickCard(o.conversationId)} onValueChange={onValueChange}
            onLeadStatusChange={onLeadStatusChange} onMarcarGanho={onMarcarGanho} onOpenChat={onOpenChat} leadStatuses={leadStatuses} onLeadStatusesChange={onLeadStatusesChange}
            dark={dark} t={t}
          />
        ))}
      </div>
    </div>
  );
}

export function WhatsappPipeline({
  pipelineId, stages, leadStatuses, opportunities, theme, onSelectConversation, onStagesChange, onLeadStatusesChange,
}: {
  pipelineId: string;
  stages: Stage[];
  leadStatuses: LeadStatus[];
  opportunities: PipelineOpportunity[];
  theme: PipelineTheme;
  onSelectConversation: (id: string) => void;
  onStagesChange: () => void;
  onLeadStatusesChange: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [localOpportunities, setLocalOpportunities] = useState(opportunities);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const t = PIPELINE_THEMES[theme];

  // sincroniza quando o pai atualiza (polling)
  useEffect(() => setLocalOpportunities(opportunities), [opportunities]);

  const semEtapa = localOpportunities.filter(o => !o.stageId || !stages.some(s => s.id === o.stageId));

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const oppId = String(e.active.id);
    const stageId = e.over ? String(e.over.id) : null;
    if (!stageId) return;

    const opp = localOpportunities.find(o => o.id === oppId);
    if (!opp || opp.stageId === stageId) return;

    setLocalOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, stageId, stageEnteredAt: new Date().toISOString() } : o));
    await fetch(`/api/ferramentas/whatsapp/conversas/${opp.conversationId}/oportunidades/${oppId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
  }

  async function handleValueChange(oppId: string, value: number) {
    const opp = localOpportunities.find(o => o.id === oppId);
    if (!opp) return;
    setLocalOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, dealValue: value } : o));
    await fetch(`/api/ferramentas/whatsapp/conversas/${opp.conversationId}/oportunidades/${oppId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealValue: value }),
    });
  }

  async function handleLeadStatusChange(conversationId: string, leadStatusId: string | null) {
    setLocalOpportunities(prev => prev.map(o => o.conversationId === conversationId ? { ...o, leadStatusId } : o));
    await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadStatusId }),
    });
  }

  async function handleMarcarGanho(oppId: string) {
    const opp = localOpportunities.find(o => o.id === oppId);
    if (!opp) return;
    const res = await fetch(`/api/ferramentas/whatsapp/conversas/${opp.conversationId}/oportunidades/${oppId}/ganho`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Não foi possível marcar como ganho."); return; }
    setLocalOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, wonAt: data.opportunity.wonAt, stageId: data.opportunity.stageId } : o));
  }

  async function handleAddStage() {
    if (!newStageName.trim()) return;
    await fetch("/api/ferramentas/whatsapp/etapas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineId, name: newStageName.trim() }),
    });
    setNewStageName("");
    onStagesChange();
  }

  async function handleRename(id: string, name: string) {
    await fetch(`/api/ferramentas/whatsapp/etapas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    onStagesChange();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir essa etapa? As oportunidades dela ficam sem etapa.")) return;
    await fetch(`/api/ferramentas/whatsapp/etapas/${id}`, { method: "DELETE" });
    onStagesChange();
  }

  const activeOpp = activeId ? localOpportunities.find(o => o.id === activeId) : null;

  return (
    <>
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-3 h-full">
          {semEtapa.length > 0 && (
            <Column
              stage={{ id: "__sem_etapa__", name: "Sem etapa", color: "#6b7280", order: -1 }}
              opportunities={semEtapa}
              onClickCard={onSelectConversation}
              onRename={() => {}}
              onDelete={() => {}}
              onValueChange={handleValueChange}
              onLeadStatusChange={handleLeadStatusChange}
              onMarcarGanho={handleMarcarGanho}
              onOpenChat={setChatConversationId}
              leadStatuses={leadStatuses}
              onLeadStatusesChange={onLeadStatusesChange}
              dark={theme === "dark"}
              t={t}
            />
          )}
          {stages.map(stage => (
            <Column
              key={stage.id}
              stage={stage}
              opportunities={localOpportunities.filter(o => o.stageId === stage.id)}
              onClickCard={onSelectConversation}
              onRename={handleRename}
              onDelete={handleDelete}
              onValueChange={handleValueChange}
              onLeadStatusChange={handleLeadStatusChange}
              onMarcarGanho={handleMarcarGanho}
              onOpenChat={setChatConversationId}
              leadStatuses={leadStatuses}
              onLeadStatusesChange={onLeadStatusesChange}
              dark={theme === "dark"}
              t={t}
            />
          ))}
          <div className="w-64 flex-shrink-0">
            <div className="flex gap-2">
              <input
                value={newStageName}
                onChange={e => setNewStageName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddStage()}
                placeholder="Nova etapa..."
                className={`flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600 ${t.addInput}`}
              />
              <button onClick={handleAddStage} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-3 py-2 text-sm font-medium text-white">+</button>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeOpp && (
          <div className={`border rounded-xl p-3 w-64 shadow-xl ${t.overlay}`}>
            <p className="font-medium text-sm truncate">{activeOpp.contactName || activeOpp.contactNumber}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
    {chatConversationId && (
      <ConversationPopup
        conversationId={chatConversationId}
        onClose={() => setChatConversationId(null)}
        dark={theme === "dark"}
      />
    )}
    </>
  );
}
