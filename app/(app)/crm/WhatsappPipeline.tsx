"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, rectIntersection,
  type DragEndEvent, type DragStartEvent, type CollisionDetection,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ThumbsUp, ThumbsDown, MessageCircle, Bot, X, ListChecks, MoreVertical, ArrowRightLeft, Shuffle, GripVertical, Pencil, Trash2, Clock, Briefcase } from "lucide-react";
import { LeadStatusBadge, type LeadStatus } from "./LeadStatusBadge";
import { ConversationPopup } from "./ConversationPopup";
import { PipelineTaskPanel } from "./PipelineTaskPanel";
import { OpportunityDetailModal } from "./OpportunityDetailModal";
import type { Attendant } from "./PipelineFiltersPanel";

export type Stage = { id: string; name: string; color: string; order: number; agenteInstrucoes?: string; followupDelaysMinutes?: number[] };

// Outros pipelines do agente (exclui o ativo) — pra "Mover pipeline" no menu do card, ver
// PipelineBoard.tsx. Move sempre pra primeira etapa (stages[0], já vem ordenada por order asc).
export type OtherPipeline = { id: string; name: string; stages: { id: string; name: string }[] };

// Follow-up por etapa: cada tentativa é um tempo (parado na etapa) + unidade, convertido pra minutos ao salvar
type DelayUnit = "horas" | "minutos";
type DelayRow = { value: number; unit: DelayUnit };
function minutesToRow(minutes: number): DelayRow {
  return minutes % 60 === 0 ? { value: minutes / 60, unit: "horas" } : { value: minutes, unit: "minutos" };
}
function rowToMinutes(row: DelayRow): number {
  return row.unit === "horas" ? row.value * 60 : row.value;
}
export type PipelineOpportunity = {
  id: string;
  conversationId: string;
  contactName: string | null;
  contactNumber: string;
  leadStatusId: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  title: string | null;
  stageId: string | null;
  dealValue: number;
  wonAt: string | null;
  lostAt: string | null;
  motivoPerdaNome: string | null;
  createdAt: string;
  stageEnteredAt: string;
  lastMessage: string | null;
  updatedAt: string;
  tasksTotal: number;
  tasksDone: number;
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
    cardSecondary: "text-gray-400",
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
    cardSecondary: "text-[#4B5563]",
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

// Cor consistente por contato (mesma paleta usada no chat/Ao vivo) — hash simples do nome/número
const AVATAR_COLORS = ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-amber-600", "bg-pink-600", "bg-cyan-600", "bg-indigo-600", "bg-rose-600"];
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

// Foto real do WhatsApp (mesmo proxy usado no chat) sobre o círculo de iniciais — cai pras
// iniciais se não tiver foto (Instagram, contato sem foto, ou erro ao buscar)
function CardAvatar({ agentId, conversationId, seed }: { agentId: string; conversationId: string; seed: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div className="relative w-8 h-8 rounded-full flex-shrink-0">
      <div className={`absolute inset-0 rounded-full ${avatarColor(seed)} text-white text-[11px] font-bold flex items-center justify-center`}>
        {(seed || "?").charAt(0).toUpperCase()}
      </div>
      {!imgFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/agentes/${agentId}/conversas/${conversationId}/foto`}
          alt=""
          className="absolute inset-0 w-8 h-8 rounded-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
    </div>
  );
}

function Card({
  agentId, opp, stageColor, attendants, outrosPipelines, onClick, onValueChange, onLeadStatusChange, onMarcarGanho, onMarcarPerda, onTransfer, onMoverPipeline, onDeleteOpportunity, onOpenChat, onOpportunitiesChange, leadStatuses, onLeadStatusesChange, dark, t,
}: {
  agentId: string;
  opp: PipelineOpportunity;
  stageColor?: string;
  attendants: { id: string; name: string; isManager: boolean }[];
  outrosPipelines: OtherPipeline[];
  onClick: () => void;
  onValueChange: (id: string, value: number) => void;
  onLeadStatusChange: (conversationId: string, leadStatusId: string | null) => void;
  onMarcarGanho: (id: string) => void;
  onMarcarPerda: (id: string) => void;
  onTransfer: (conversationId: string, attendantId: string) => void;
  onMoverPipeline: (oppId: string, stageId: string) => void;
  onDeleteOpportunity: (id: string) => void;
  onOpenChat: (conversationId: string) => void;
  onOpportunitiesChange: () => void;
  leadStatuses: LeadStatus[];
  onLeadStatusesChange: () => void;
  dark: boolean;
  t: typeof PIPELINE_THEMES.dark;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: opp.id });
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(opp.dealValue));
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [menuView, setMenuView] = useState<"main" | "transfer" | "pipeline">("main");
  const [taskPanelPos, setTaskPanelPos] = useState<{ top: number; left: number } | null>(null);
  const closed = Boolean(opp.wonAt || opp.lostAt);

  function toggleMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (menuPos) { closeMenu(); return; }
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 200) });
    setMenuView("main");
  }
  function closeMenu() { setMenuPos(null); setMenuView("main"); }

  function openTaskPanel() {
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) setTaskPanelPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 300) });
  }

  function commitValue() {
    setEditingValue(false);
    const parsed = Number(valueInput.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0 && parsed !== opp.dealValue) onValueChange(opp.id, parsed);
    else setValueInput(String(opp.dealValue));
  }

  const menuItemClass = `w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs ${dark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`border rounded-xl p-3 cursor-pointer transition-colors shadow-sm flex flex-col min-h-[152px] ${t.card} ${isDragging ? "opacity-30" : ""} ${stageColor ? "border-l-4" : ""}`}
      style={stageColor ? { borderLeftColor: stageColor } : undefined}
    >
      <div className="flex items-center gap-2">
        <CardAvatar agentId={agentId} conversationId={opp.conversationId} seed={opp.contactName || opp.contactNumber} />
        <p className="font-semibold text-[13.5px] leading-tight truncate flex-1">{opp.contactName || opp.contactNumber}</p>
        <button
          onClick={e => { e.stopPropagation(); onOpenChat(opp.conversationId); }}
          onPointerDown={e => e.stopPropagation()}
          title="Abrir conversa"
          className={`p-1 rounded flex-shrink-0 ${dark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
        >
          <MessageCircle size={14} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          onPointerDown={e => e.stopPropagation()}
          title="Detalhes"
          className={`p-1 rounded flex-shrink-0 ${dark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
        >
          <Briefcase size={14} />
        </button>
        <button
          ref={menuBtnRef}
          onClick={toggleMenu}
          onPointerDown={e => e.stopPropagation()}
          title="Mais opções"
          className={`p-1 rounded flex-shrink-0 ${dark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
        >
          <MoreVertical size={14} />
        </button>
      </div>
      <p className={`text-[11.5px] truncate mt-1 ${t.cardSecondary}`}>{opp.title || opp.lastMessage || "—"}</p>
      <div className={`flex items-center justify-between gap-2 mt-2 text-[9.5px] font-medium uppercase tracking-wide ${t.cardSecondary}`}>
        <span>Aberta {formatDate(opp.createdAt)}</span>
        <span className={daysSince(opp.stageEnteredAt) >= 7 ? "text-amber-500" : ""}>
          {daysSince(opp.stageEnteredAt)}d na etapa
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        {opp.assignedToName ? (
          <p className={`text-[9.5px] font-medium uppercase tracking-wide truncate ${t.cardSecondary}`}>Vendedor · {opp.assignedToName}</p>
        ) : <span />}
        {opp.lostAt && (
          <span className="text-[9px] font-bold uppercase tracking-wide text-red-400 flex-shrink-0" title={opp.motivoPerdaNome ?? undefined}>
            Perdida{opp.motivoPerdaNome ? ` · ${opp.motivoPerdaNome}` : ""}
          </span>
        )}
      </div>

      {menuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); closeMenu(); }} onPointerDown={e => e.stopPropagation()} />
          <div
            className={`fixed z-50 w-48 rounded-xl border shadow-xl py-1 ${dark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
          >
            {menuView === "main" ? (
              <>
                <button onClick={() => { closeMenu(); openTaskPanel(); }} className={menuItemClass}>
                  <ListChecks size={13} /> {opp.tasksTotal > 0 ? `Tarefas (${opp.tasksDone}/${opp.tasksTotal})` : "Nova tarefa"}
                </button>
                {!closed && (
                  <button onClick={() => { closeMenu(); setEditingValue(true); }} className={menuItemClass}>
                    <Pencil size={13} /> Editar valor
                  </button>
                )}
                <button onClick={e => { e.stopPropagation(); setMenuView("transfer"); }} className={menuItemClass}>
                  <ArrowRightLeft size={13} /> Transferir
                </button>
                {!closed && outrosPipelines.length > 0 && (
                  <button onClick={e => { e.stopPropagation(); setMenuView("pipeline"); }} className={menuItemClass}>
                    <Shuffle size={13} /> Mover pipeline
                  </button>
                )}
                <button onClick={() => { closeMenu(); onOpenChat(opp.conversationId); }} className={menuItemClass}>
                  <MessageCircle size={13} /> Abrir conversa
                </button>
                {!closed && (
                  <>
                    <button onClick={() => { closeMenu(); onMarcarGanho(opp.id); }} className={`${menuItemClass} text-green-500`}>
                      <ThumbsUp size={13} /> Ganho
                    </button>
                    <button onClick={() => { closeMenu(); onMarcarPerda(opp.id); }} className={`${menuItemClass} text-red-400`}>
                      <ThumbsDown size={13} /> Perda
                    </button>
                  </>
                )}
                <button
                  onClick={() => { closeMenu(); if (confirm(`Excluir a oportunidade de ${opp.contactName || opp.contactNumber}?`)) onDeleteOpportunity(opp.id); }}
                  className={`${menuItemClass} text-red-400`}
                >
                  <Trash2 size={13} /> Excluir
                </button>
              </>
            ) : menuView === "transfer" ? (
              <>
                <div className={`px-3 py-1.5 text-[10px] uppercase tracking-wide font-medium ${t.cardSecondary}`}>Transferir para</div>
                {attendants.length === 0 && <p className="px-3 py-1.5 text-xs text-gray-500">Nenhum atendente</p>}
                {attendants.map(a => (
                  <button key={a.id} onClick={() => { closeMenu(); onTransfer(opp.conversationId, a.id); }} className={menuItemClass}>
                    {a.name}
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className={`px-3 py-1.5 text-[10px] uppercase tracking-wide font-medium ${t.cardSecondary}`}>Mover pra pipeline</div>
                {outrosPipelines.map(p => (
                  <button
                    key={p.id}
                    disabled={p.stages.length === 0}
                    onClick={() => { closeMenu(); if (p.stages[0]) onMoverPipeline(opp.id, p.stages[0].id); }}
                    className={`${menuItemClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={p.stages.length === 0 ? "Esse pipeline não tem etapas" : `Entra em "${p.stages[0].name}"`}
                  >
                    {p.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {taskPanelPos && (
        <PipelineTaskPanel
          agentId={agentId}
          conversationId={opp.conversationId}
          oppId={opp.id}
          pos={taskPanelPos}
          onClose={() => setTaskPanelPos(null)}
          onTasksChange={onOpportunitiesChange}
          dark={dark}
        />
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
          className={`w-full mt-auto border rounded px-2 py-1 text-xs ${t.input}`}
        />
      ) : (
        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <p
            className={`text-[15px] font-bold leading-none ${
              opp.lostAt ? "text-gray-500 line-through" : "text-green-500"
            } ${!closed ? "cursor-text" : ""}`}
            onClick={e => { if (!closed) { e.stopPropagation(); setEditingValue(true); } }}
            onPointerDown={e => e.stopPropagation()}
          >
            {opp.wonAt ? `🏆 ${formatBRL(opp.dealValue)}` : formatBRL(opp.dealValue)}
          </p>
          <LeadStatusBadge
            agentId={agentId}
            leadStatusId={opp.leadStatusId}
            statuses={leadStatuses}
            onChange={id => onLeadStatusChange(opp.conversationId, id)}
            onStatusesChange={onLeadStatusesChange}
            dark={dark}
          />
        </div>
      )}
    </div>
  );
}

function Column({
  agentId, stage, opportunities, attendants, outrosPipelines, onOpenDetails, onRename, onDelete, onStagesChange, onValueChange, onLeadStatusChange, onMarcarGanho, onMarcarPerda, onTransfer, onMoverPipeline, onDeleteOpportunity, onOpenChat, onOpportunitiesChange, leadStatuses, onLeadStatusesChange, dark, t,
}: {
  agentId: string;
  stage: Stage;
  opportunities: PipelineOpportunity[];
  attendants: Attendant[];
  outrosPipelines: OtherPipeline[];
  onOpenDetails: (opp: PipelineOpportunity) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onStagesChange: () => void;
  onValueChange: (id: string, value: number) => void;
  onLeadStatusChange: (conversationId: string, leadStatusId: string | null) => void;
  onMarcarGanho: (id: string) => void;
  onMarcarPerda: (id: string) => void;
  onTransfer: (conversationId: string, attendantId: string) => void;
  onMoverPipeline: (oppId: string, stageId: string) => void;
  onDeleteOpportunity: (id: string) => void;
  onOpenChat: (conversationId: string) => void;
  onOpportunitiesChange: () => void;
  leadStatuses: LeadStatus[];
  onLeadStatusesChange: () => void;
  dark: boolean;
  t: typeof PIPELINE_THEMES.dark;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  // Reordenar colunas: "Sem etapa" é uma pseudo-coluna (não existe no banco), nunca arrastável
  const isRealStage = stage.id !== "__sem_etapa__";
  const {
    attributes: sortableAttrs, listeners: sortableListeners, setNodeRef: setSortableRef,
    transform, transition, isDragging: isColDragging,
  } = useSortable({ id: `col:${stage.id}`, disabled: !isRealStage });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);

  // Agente da etapa: instruções que a IA segue enquanto o lead está aqui
  const [showAgente, setShowAgente] = useState(false);
  const [instrucoes, setInstrucoes] = useState(stage.agenteInstrucoes ?? "");
  const [salvandoAgente, setSalvandoAgente] = useState(false);
  const temAgente = (stage.agenteInstrucoes ?? "").trim().length > 0;

  // Follow-up automático: dispara sozinho se o lead ficar parado demais nesta etapa
  const [followupRows, setFollowupRows] = useState<DelayRow[]>((stage.followupDelaysMinutes ?? []).map(minutesToRow));
  const temFollowup = (stage.followupDelaysMinutes ?? []).length > 0;

  function addFollowupRow() {
    const last = followupRows[followupRows.length - 1] ?? { value: 24, unit: "horas" as DelayUnit };
    setFollowupRows([...followupRows, { ...last }]);
  }
  function removeFollowupRow(i: number) {
    setFollowupRows(followupRows.filter((_, idx) => idx !== i));
  }
  function updateFollowupRow(i: number, row: Partial<DelayRow>) {
    setFollowupRows(followupRows.map((r, idx) => (idx === i ? { ...r, ...row } : r)));
  }

  async function salvarAgente() {
    setSalvandoAgente(true);
    try {
      await fetch(`/api/ferramentas/whatsapp/etapas/${stage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agenteInstrucoes: instrucoes.trim(), followupDelaysMinutes: followupRows.map(rowToMinutes) }),
      });
      setShowAgente(false);
      onStagesChange();
    } finally {
      setSalvandoAgente(false);
    }
  }

  const total = opportunities.reduce((sum, o) => sum + o.dealValue, 0);

  return (
    <div
      ref={node => { setNodeRef(node); setSortableRef(node); }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`w-72 flex-shrink-0 flex flex-col rounded-2xl border overflow-hidden ${isColDragging ? "opacity-30" : ""} ${isOver ? "border-blue-500" : t.column}`}
    >
      <div className="h-[3px] flex-shrink-0" style={{ backgroundColor: stage.color }} />
      <div className={`group p-3 border-b ${t.columnHeaderBorder}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {isRealStage && (
              <button
                {...sortableAttrs}
                {...sortableListeners}
                title="Arrastar pra reordenar"
                className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 touch-none"
              >
                <GripVertical size={14} />
              </button>
            )}
            {editing ? (
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => { setEditing(false); if (name.trim() && name !== stage.name) onRename(stage.id, name.trim()); }}
                onKeyDown={e => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                className={`border rounded px-2 py-0.5 text-sm ${t.nameInput}`}
              />
            ) : (
              <p
                className="font-bold text-[12.5px] uppercase tracking-wide truncate cursor-text"
                onClick={() => setEditing(true)}
              >
                {stage.name}
              </p>
            )}
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: `${stage.color}33`, color: stage.color }}
            >
              {opportunities.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => {
                setInstrucoes(stage.agenteInstrucoes ?? "");
                setFollowupRows((stage.followupDelaysMinutes ?? []).map(minutesToRow));
                setShowAgente(s => !s);
              }}
              title={temAgente || temFollowup ? "Agente da etapa configurado — clique para editar" : "Configurar agente responsável por esta etapa"}
              className={`flex-shrink-0 flex ${
                temAgente || temFollowup ? "text-blue-400 hover:text-blue-300" : "md:hidden md:group-hover:flex text-gray-600 hover:text-gray-400"
              }`}
            >
              <Bot size={14} />
            </button>
            <button
              onClick={() => onDelete(stage.id)}
              title="Excluir etapa"
              className="flex-shrink-0 flex md:hidden md:group-hover:flex text-gray-500 hover:text-red-400"
            >
              <X size={14} />
            </button>
            {total > 0 && <p className="text-[11px] font-semibold leading-none text-green-500 whitespace-nowrap">{formatBRL(total)}</p>}
          </div>
        </div>

        {showAgente && (
          <div className={`mt-2 rounded-xl border p-2.5 space-y-2 ${dark ? "bg-gray-950 border-gray-700" : "bg-white border-gray-300"}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold flex items-center gap-1"><Bot size={11} /> Agente desta etapa</p>
              <button onClick={() => setShowAgente(false)} className="text-gray-500 hover:text-gray-300"><X size={12} /></button>
            </div>
            <textarea
              value={instrucoes}
              onChange={e => setInstrucoes(e.target.value)}
              rows={4}
              maxLength={1500}
              placeholder={`Como a IA deve agir com leads na etapa "${stage.name}"?\nEx: foque em entender a necessidade e agendar uma demonstração; não fale de preço ainda.`}
              className={`w-full rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none border ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
            />

            <div className={`pt-2 border-t space-y-1.5 ${dark ? "border-gray-800" : "border-gray-200"}`}>
              <p className="text-xs font-semibold flex items-center gap-1"><Clock size={11} /> Follow-up automático</p>
              <p className="text-[10px] text-gray-500">Se o lead ficar parado nesta etapa sem avançar (e a última mensagem foi nossa), a IA manda uma mensagem sozinha.</p>
              {followupRows.map((row, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500 w-16 flex-shrink-0">{i === 0 ? "1ª após" : `${i + 1}ª, +`}</span>
                  <input
                    type="number" min={1} value={row.value}
                    onChange={e => updateFollowupRow(i, { value: Math.max(1, Number(e.target.value)) })}
                    className={`w-14 rounded px-1.5 py-1 text-xs border focus:outline-none ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
                  />
                  <select
                    value={row.unit} onChange={e => updateFollowupRow(i, { unit: e.target.value as DelayUnit })}
                    className={`rounded px-1.5 py-1 text-xs border focus:outline-none ${dark ? "bg-gray-900 border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
                  >
                    <option value="horas">horas</option>
                    <option value="minutos">min</option>
                  </select>
                  <button onClick={() => removeFollowupRow(i)} className="text-gray-500 hover:text-red-400 ml-auto"><X size={12} /></button>
                </div>
              ))}
              {followupRows.length < 5 && (
                <button onClick={addFollowupRow} className="text-[11px] text-blue-400 hover:text-blue-300">+ Adicionar tentativa</button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-gray-500">Vazio = comportamento padrão do agente.</p>
              <button
                onClick={salvarAgente}
                disabled={salvandoAgente}
                className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-3 py-1 font-medium"
              >
                {salvandoAgente ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {opportunities.map(o => (
          <Card
            key={o.id} agentId={agentId} opp={o} stageColor={stage.color} attendants={attendants} outrosPipelines={outrosPipelines} onClick={() => onOpenDetails(o)} onValueChange={onValueChange}
            onLeadStatusChange={onLeadStatusChange} onMarcarGanho={onMarcarGanho} onMarcarPerda={onMarcarPerda} onTransfer={onTransfer} onMoverPipeline={onMoverPipeline} onDeleteOpportunity={onDeleteOpportunity}
            onOpenChat={onOpenChat} onOpportunitiesChange={onOpportunitiesChange}
            leadStatuses={leadStatuses} onLeadStatusesChange={onLeadStatusesChange}
            dark={dark} t={t}
          />
        ))}
      </div>
    </div>
  );
}

export function WhatsappPipeline({
  agentId, pipelineId, stages, leadStatuses, opportunities, theme, attendants, motivosPerda, outrosPipelines, onStagesChange, onLeadStatusesChange, onOpportunitiesChange,
}: {
  agentId: string;
  pipelineId: string;
  stages: Stage[];
  leadStatuses: LeadStatus[];
  opportunities: PipelineOpportunity[];
  theme: PipelineTheme;
  attendants: Attendant[];
  motivosPerda: { id: string; nome: string }[];
  outrosPipelines: OtherPipeline[];
  onStagesChange: () => void;
  onLeadStatusesChange: () => void;
  onOpportunitiesChange: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [perdaOppId, setPerdaOppId] = useState<string | null>(null);
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);
  const [detailOppId, setDetailOppId] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [localOpportunities, setLocalOpportunities] = useState(opportunities);
  const [localStages, setLocalStages] = useState(stages);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const t = PIPELINE_THEMES[theme];

  // sincroniza quando o pai atualiza (polling)
  useEffect(() => setLocalOpportunities(opportunities), [opportunities]);
  useEffect(() => setLocalStages(stages), [stages]);

  const semEtapa = localOpportunities.filter(o => !o.stageId || !localStages.some(s => s.id === o.stageId));

  // O mesmo DndContext cobre dois tipos de arrastar (card pra etapa, e coluna pra reordenar) —
  // ids de coluna vêm prefixados com "col:" só pra não colidir com o id da oportunidade. Sem
  // esse filtro de namespace, um card e uma coluna ocupando a mesma área (mesmo <div>) fariam
  // o dnd-kit escolher "over" ambíguo entre os dois tipos de zona.
  const collisionDetectionStrategy: CollisionDetection = args => {
    const activeIsColumn = String(args.active.id).startsWith("col:");
    const filtered = args.droppableContainers.filter(c => String(c.id).startsWith("col:") === activeIsColumn);
    return rectIntersection({ ...args, droppableContainers: filtered });
  };

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleReorderStages(fromStageId: string, toStageId: string) {
    const oldIndex = localStages.findIndex(s => s.id === fromStageId);
    const newIndex = localStages.findIndex(s => s.id === toStageId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    const reordered = arrayMove(localStages, oldIndex, newIndex);
    setLocalStages(reordered);
    await Promise.all(reordered.map((s, i) => fetch(`/api/ferramentas/whatsapp/etapas/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: i }),
    })));
    onStagesChange();
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const activeIdStr = String(e.active.id);
    const overIdStr = e.over ? String(e.over.id) : null;
    if (!overIdStr) return;

    if (activeIdStr.startsWith("col:")) {
      if (!overIdStr.startsWith("col:")) return;
      handleReorderStages(activeIdStr.slice(4), overIdStr.slice(4));
      return;
    }

    const oppId = activeIdStr;
    const stageId = overIdStr;
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

  function handleMarcarPerda(oppId: string) {
    setPerdaOppId(oppId);
  }

  async function confirmarPerda(motivoPerdaId: string | null) {
    const oppId = perdaOppId;
    const opp = oppId ? localOpportunities.find(o => o.id === oppId) : null;
    if (!oppId || !opp) return;
    setPerdaOppId(null);
    const res = await fetch(`/api/ferramentas/whatsapp/conversas/${opp.conversationId}/oportunidades/${oppId}/perda`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivoPerdaId }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Não foi possível marcar como perda."); return; }
    const motivoNome = motivosPerda.find(m => m.id === motivoPerdaId)?.nome ?? null;
    setLocalOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, lostAt: data.opportunity.lostAt, stageId: data.opportunity.stageId, motivoPerdaNome: motivoNome } : o));
  }

  // Move a oportunidade pra primeira etapa de outro pipeline — o PATCH de etapa não exige que
  // a nova etapa pertença ao mesmo pipeline da atual, só ao mesmo agente (ver
  // app/api/ferramentas/whatsapp/conversas/[id]/oportunidades/[oppId]/route.ts:36-39), então
  // reaproveita o mesmo endpoint do drag-and-drop entre etapas.
  async function handleMoverPipeline(oppId: string, stageId: string) {
    const opp = localOpportunities.find(o => o.id === oppId);
    if (!opp) return;
    setLocalOpportunities(prev => prev.filter(o => o.id !== oppId));
    await fetch(`/api/ferramentas/whatsapp/conversas/${opp.conversationId}/oportunidades/${oppId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    onOpportunitiesChange();
  }

  async function handleTransfer(conversationId: string, attendantId: string) {
    await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: attendantId }),
    });
    onOpportunitiesChange();
  }

  async function handleDeleteOpportunity(oppId: string) {
    const opp = localOpportunities.find(o => o.id === oppId);
    if (!opp) return;
    setLocalOpportunities(prev => prev.filter(o => o.id !== oppId));
    await fetch(`/api/ferramentas/whatsapp/conversas/${opp.conversationId}/oportunidades/${oppId}`, { method: "DELETE" });
    onOpportunitiesChange();
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

  const activeOpp = activeId && !activeId.startsWith("col:") ? localOpportunities.find(o => o.id === activeId) : null;
  const activeCol = activeId?.startsWith("col:") ? localStages.find(s => s.id === activeId.slice(4)) : null;
  const detailOpp = detailOppId ? localOpportunities.find(o => o.id === detailOppId) : null;

  return (
    <>
    <DndContext sensors={sensors} collisionDetection={collisionDetectionStrategy} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-3 h-full">
          {semEtapa.length > 0 && (
            <Column
              agentId={agentId}
              stage={{ id: "__sem_etapa__", name: "Sem etapa", color: "#6b7280", order: -1 }}
              opportunities={semEtapa}
              attendants={attendants}
              outrosPipelines={outrosPipelines}
              onOpenDetails={opp => setDetailOppId(opp.id)}
              onRename={() => {}}
              onDelete={() => {}}
              onStagesChange={() => {}}
              onValueChange={handleValueChange}
              onLeadStatusChange={handleLeadStatusChange}
              onMarcarGanho={handleMarcarGanho}
              onMarcarPerda={handleMarcarPerda}
              onTransfer={handleTransfer}
              onMoverPipeline={handleMoverPipeline}
              onDeleteOpportunity={handleDeleteOpportunity}
              onOpenChat={setChatConversationId}
              onOpportunitiesChange={onOpportunitiesChange}
              leadStatuses={leadStatuses}
              onLeadStatusesChange={onLeadStatusesChange}
              dark={theme === "dark"}
              t={t}
            />
          )}
          <SortableContext items={localStages.map(s => `col:${s.id}`)} strategy={horizontalListSortingStrategy}>
            {localStages.map(stage => (
              <Column
                key={stage.id}
                agentId={agentId}
                stage={stage}
                opportunities={localOpportunities.filter(o => o.stageId === stage.id)}
                attendants={attendants}
                outrosPipelines={outrosPipelines}
                onOpenDetails={opp => setDetailOppId(opp.id)}
                onRename={handleRename}
                onDelete={handleDelete}
                onStagesChange={onStagesChange}
                onValueChange={handleValueChange}
                onLeadStatusChange={handleLeadStatusChange}
                onMarcarGanho={handleMarcarGanho}
                onMarcarPerda={handleMarcarPerda}
                onTransfer={handleTransfer}
                onMoverPipeline={handleMoverPipeline}
                onDeleteOpportunity={handleDeleteOpportunity}
                onOpenChat={setChatConversationId}
                onOpportunitiesChange={onOpportunitiesChange}
                leadStatuses={leadStatuses}
                onLeadStatusesChange={onLeadStatusesChange}
                dark={theme === "dark"}
                t={t}
              />
            ))}
          </SortableContext>
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
        {activeOpp ? (
          <div className={`border rounded-xl p-3 w-64 shadow-xl ${t.overlay}`}>
            <p className="font-medium text-sm truncate">{activeOpp.contactName || activeOpp.contactNumber}</p>
          </div>
        ) : activeCol ? (
          <div className={`w-72 rounded-2xl border p-3 shadow-xl ${t.overlay}`}>
            <p className="font-bold text-xs uppercase tracking-wide truncate">{activeCol.name}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
    {chatConversationId && (
      <ConversationPopup
        conversationId={chatConversationId}
        onClose={() => setChatConversationId(null)}
        dark={theme === "dark"}
      />
    )}
    {detailOpp && (
      <OpportunityDetailModal
        agentId={agentId}
        opp={detailOpp}
        stages={localStages}
        dark={theme === "dark"}
        onClose={() => setDetailOppId(null)}
        onValueChange={handleValueChange}
        onMarcarGanho={handleMarcarGanho}
        onMarcarPerda={handleMarcarPerda}
        onOpportunitiesChange={onOpportunitiesChange}
      />
    )}
    {perdaOppId && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPerdaOppId(null)}>
        <div
          onClick={e => e.stopPropagation()}
          className={`w-80 rounded-2xl border p-4 space-y-3 ${theme === "dark" ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}
        >
          <p className="text-sm font-semibold">Motivo da perda</p>
          {motivosPerda.length === 0 ? (
            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
              Nenhum motivo cadastrado ainda — configure em Configurações &gt; Motivos de perda.
            </p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {motivosPerda.map(m => (
                <button
                  key={m.id}
                  onClick={() => confirmarPerda(m.id)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-xl border transition-colors ${theme === "dark" ? "border-gray-800 hover:border-red-700 hover:bg-red-950/20" : "border-gray-200 hover:border-red-300 hover:bg-red-50"}`}
                >
                  {m.nome}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => setPerdaOppId(null)} className={`text-xs ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-800"}`}>
              Cancelar
            </button>
            <button onClick={() => confirmarPerda(null)} className="text-xs font-medium text-red-400 hover:text-red-300">
              Marcar sem motivo específico
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
