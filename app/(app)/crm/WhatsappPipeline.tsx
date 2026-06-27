"use client";

import { useEffect, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { LeadStatusBadge, type LeadStatus } from "./LeadStatusBadge";

export type Stage = { id: string; name: string; color: string; order: number };
export type PipelineConversation = {
  id: string;
  contactName: string | null;
  contactNumber: string;
  stageId: string | null;
  leadStatusId: string | null;
  dealValue: number | null;
  lastMessage: string | null;
  updatedAt: string;
};
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
  conv, onClick, onValueChange, onLeadStatusChange, leadStatuses, onLeadStatusesChange, dark, t,
}: {
  conv: PipelineConversation;
  onClick: () => void;
  onValueChange: (id: string, value: number | null) => void;
  onLeadStatusChange: (id: string, leadStatusId: string | null) => void;
  leadStatuses: LeadStatus[];
  onLeadStatusesChange: () => void;
  dark: boolean;
  t: typeof PIPELINE_THEMES.dark;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: conv.id });
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(conv.dealValue != null ? String(conv.dealValue) : "");

  function commitValue() {
    setEditingValue(false);
    const raw = valueInput.trim() === "" ? null : Number(valueInput.replace(",", "."));
    const parsed = raw !== null && Number.isFinite(raw) ? raw : null;
    if (parsed !== conv.dealValue) onValueChange(conv.id, parsed);
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
        <p className="font-medium text-sm truncate">{conv.contactName || conv.contactNumber}</p>
        <LeadStatusBadge
          leadStatusId={conv.leadStatusId}
          statuses={leadStatuses}
          onChange={id => onLeadStatusChange(conv.id, id)}
          onStatusesChange={onLeadStatusesChange}
          dark={dark}
        />
      </div>
      <p className={`text-xs truncate mt-1 ${t.cardSecondary}`}>{conv.lastMessage || "—"}</p>
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
        <p
          className="text-xs font-semibold text-green-500 mt-2 cursor-text"
          onClick={e => { e.stopPropagation(); setEditingValue(true); }}
          onPointerDown={e => e.stopPropagation()}
        >
          {conv.dealValue != null ? formatBRL(conv.dealValue) : "+ valor negociado"}
        </p>
      )}
    </div>
  );
}

function Column({
  stage, conversations, onClickCard, onRename, onDelete, onValueChange, onLeadStatusChange, leadStatuses, onLeadStatusesChange, dark, t,
}: {
  stage: Stage;
  conversations: PipelineConversation[];
  onClickCard: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onValueChange: (id: string, value: number | null) => void;
  onLeadStatusChange: (id: string, leadStatusId: string | null) => void;
  leadStatuses: LeadStatus[];
  onLeadStatusesChange: () => void;
  dark: boolean;
  t: typeof PIPELINE_THEMES.dark;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);

  const total = conversations.reduce((sum, c) => sum + (c.dealValue ?? 0), 0);

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
          <span className={`text-xs ${t.columnCount}`}>{conversations.length}</span>
          <button onClick={() => onDelete(stage.id)} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
        </div>
        {total > 0 && <p className="text-xs font-semibold text-green-500 mt-1.5">{formatBRL(total)}</p>}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {conversations.map(c => (
          <Card
            key={c.id} conv={c} onClick={() => onClickCard(c.id)} onValueChange={onValueChange}
            onLeadStatusChange={onLeadStatusChange} leadStatuses={leadStatuses} onLeadStatusesChange={onLeadStatusesChange}
            dark={dark} t={t}
          />
        ))}
      </div>
    </div>
  );
}

export function WhatsappPipeline({
  pipelineId, stages, leadStatuses, conversations, theme, onSelectConversation, onStagesChange, onLeadStatusesChange,
}: {
  pipelineId: string;
  stages: Stage[];
  leadStatuses: LeadStatus[];
  conversations: PipelineConversation[];
  theme: PipelineTheme;
  onSelectConversation: (id: string) => void;
  onStagesChange: () => void;
  onLeadStatusesChange: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [localConversations, setLocalConversations] = useState(conversations);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const t = PIPELINE_THEMES[theme];

  // sincroniza quando o pai atualiza (polling)
  useEffect(() => setLocalConversations(conversations), [conversations]);

  const semEtapa = localConversations.filter(c => !c.stageId || !stages.some(s => s.id === c.stageId));

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const conversationId = String(e.active.id);
    const stageId = e.over ? String(e.over.id) : null;
    if (!stageId) return;

    setLocalConversations(prev => prev.map(c => c.id === conversationId ? { ...c, stageId } : c));
    await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
  }

  async function handleValueChange(conversationId: string, value: number | null) {
    setLocalConversations(prev => prev.map(c => c.id === conversationId ? { ...c, dealValue: value } : c));
    await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealValue: value }),
    });
  }

  async function handleLeadStatusChange(conversationId: string, leadStatusId: string | null) {
    setLocalConversations(prev => prev.map(c => c.id === conversationId ? { ...c, leadStatusId } : c));
    await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadStatusId }),
    });
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
    if (!confirm("Excluir essa etapa? As conversas dela ficam sem etapa.")) return;
    await fetch(`/api/ferramentas/whatsapp/etapas/${id}`, { method: "DELETE" });
    onStagesChange();
  }

  const activeConv = activeId ? localConversations.find(c => c.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-3 h-full">
          {semEtapa.length > 0 && (
            <Column
              stage={{ id: "__sem_etapa__", name: "Sem etapa", color: "#6b7280", order: -1 }}
              conversations={semEtapa}
              onClickCard={onSelectConversation}
              onRename={() => {}}
              onDelete={() => {}}
              onValueChange={handleValueChange}
              onLeadStatusChange={handleLeadStatusChange}
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
              conversations={localConversations.filter(c => c.stageId === stage.id)}
              onClickCard={onSelectConversation}
              onRename={handleRename}
              onDelete={handleDelete}
              onValueChange={handleValueChange}
              onLeadStatusChange={handleLeadStatusChange}
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
        {activeConv && (
          <div className={`border rounded-xl p-3 w-64 shadow-xl ${t.overlay}`}>
            <p className="font-medium text-sm truncate">{activeConv.contactName || activeConv.contactNumber}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
