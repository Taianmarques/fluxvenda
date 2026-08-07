"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { ThumbsUp, ThumbsDown, MessageCircle, Bot, X, ListChecks, MoreVertical, ArrowRightLeft, GitBranch, Pencil, Trash2, Clock } from "lucide-react";
import { LeadStatusBadge, type LeadStatus } from "./LeadStatusBadge";
import { ConversationPopup } from "./ConversationPopup";
import { PipelineTaskPanel } from "./PipelineTaskPanel";
import type { Attendant } from "./PipelineFiltersPanel";

export type Stage = { id: string; name: string; color: string; order: number; agenteInstrucoes?: string; followupDelaysMinutes?: number[] };

export type PipelineOption = { id: string; name: string; stages: { id: string; name: string }[] };

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
  agentId, opp, stageColor, attendants, onClick, onValueChange, onLeadStatusChange, onMarcarGanho, onMarcarPerda, onTransfer, pipelines, onMovePipeline, onDeleteOpportunity, onOpenChat, onOpportunitiesChange, leadStatuses, onLeadStatusesChange, dark, t,
}: {
  agentId: string;
  opp: PipelineOpportunity;
  stageColor?: string;
  attendants: { id: string; name: string; isManager: boolean }[];
  onClick: () => void;
  onValueChange: (id: string, value: number) => void;
  onLeadStatusChange: (conversationId: string, leadStatusId: string | null) => void;
  onMarcarGanho: (id: string) => void;
  onMarcarPerda: (id: string) => void;
  onTransfer: (conversationId: string, attendantId: string) => void;
  pipelines: PipelineOption[];
  onMovePipeline: (id: string, stageId: string) => void;
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
  const [menuView, setMenuView] = useState<"main" | "transfer" | "movepipeline">("main");
  const [taskPanelPos, setTaskPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [movePipelineId, setMovePipelineId] = useState("");
  const [moveStageId, setMoveStageId] = useState("");
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
          <span className="text-[9px] font-bold uppercase tracking-wide text-red-400 flex-shrink-0">Perdida</span>
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
                {!closed && pipelines.length > 1 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      const first = pipelines[0];
                      setMovePipelineId(first?.id ?? "");
                      setMoveStageId(first?.stages[0]?.id ?? "");
                      setMenuView("movepipeline");
                    }}
                    className={menuItemClass}
                  >
                    <GitBranch size={13} /> Mover pipeline
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
                <div className={`px-3 py-1.5 text-[10px] uppercase tracking-wide font-medium ${t.cardSecondary}`}>Mover para pipeline</div>
                <div className="px-3 pb-2 space-y-1.5">
                  <select
                    autoFocus
                    value={movePipelineId}
                    onChange={e => {
                      const pid = e.target.value;
                      setMovePipelineId(pid);
                      setMoveStageId(pipelines.find(p => p.id === pid)?.stages[0]?.id ?? "");
                    }}
                    onClick={e => e.stopPropagation()}
                    className={`w-full text-xs rounded-lg px-2 py-1 border focus:outline-none ${dark ? "bg-gray-950 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  >
                    {pipelines.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={moveStageId}
                    onChange={e => setMoveStageId(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className={`w-full text-xs rounded-lg px-2 py-1 border focus:outline-none ${dark ? "bg-gray-950 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  >
                    {pipelines.find(p => p.id === movePipelineId)?.stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { closeMenu(); if (moveStageId) onMovePipeline(opp.id, moveStageId); }}
                      className="flex-1 text-xs font-medium bg-blue-700 hover:bg-blue-600 text-white rounded-lg py-1.5"
                    >
                      Confirmar
                    </button>
                    <button onClick={() => setMenuView("main")} className={`text-xs px-2 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100"}`}>
                      Voltar
                    </button>
                  </div>
                </div>
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
  agentId, stage, opportunities, attendants, onClickCard, onRename, onDelete, onStagesChange, onValueChange, onLeadStatusChange, onMarcarGanho, onMarcarPerda, onTransfer, pipelines, onMovePipeline, onDeleteOpportunity, onOpenChat, onOpportunitiesChange, leadStatuses, onLeadStatusesChange, dark, t,
}: {
  agentId: string;
  stage: Stage;
  opportunities: PipelineOpportunity[];
  attendants: Attendant[];
  onClickCard: (conversationId: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onStagesChange: () => void;
  onValueChange: (id: string, value: number) => void;
  onLeadStatusChange: (conversationId: string, leadStatusId: string | null) => void;
  onMarcarGanho: (id: string) => void;
  onMarcarPerda: (id: string) => void;
  onTransfer: (conversationId: string, attendantId: string) => void;
  pipelines: PipelineOption[];
  onMovePipeline: (id: string, stageId: string) => void;
  onDeleteOpportunity: (id: string) => void;
  onOpenChat: (conversationId: string) => void;
  onOpportunitiesChange: () => void;
  leadStatuses: LeadStatus[];
  onLeadStatusesChange: () => void;
  dark: boolean;
  t: typeof PIPELINE_THEMES.dark;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
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
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 flex flex-col rounded-2xl border overflow-hidden ${isOver ? "border-blue-500" : t.column}`}
    >
      <div className="h-[3px] flex-shrink-0" style={{ backgroundColor: stage.color }} />
      <div className={`group p-3 border-b ${t.columnHeaderBorder}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
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
            key={o.id} agentId={agentId} opp={o} stageColor={stage.color} attendants={attendants} onClick={() => onClickCard(o.conversationId)} onValueChange={onValueChange}
            onLeadStatusChange={onLeadStatusChange} onMarcarGanho={onMarcarGanho} onMarcarPerda={onMarcarPerda} onTransfer={onTransfer}
            pipelines={pipelines} onMovePipeline={onMovePipeline} onDeleteOpportunity={onDeleteOpportunity}
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
  agentId, pipelineId, stages, leadStatuses, opportunities, theme, attendants, onSelectConversation, onStagesChange, onLeadStatusesChange, onOpportunitiesChange,
}: {
  agentId: string;
  pipelineId: string;
  stages: Stage[];
  leadStatuses: LeadStatus[];
  opportunities: PipelineOpportunity[];
  theme: PipelineTheme;
  attendants: Attendant[];
  onSelectConversation: (id: string) => void;
  onStagesChange: () => void;
  onLeadStatusesChange: () => void;
  onOpportunitiesChange: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [localOpportunities, setLocalOpportunities] = useState(opportunities);
  const [pipelines, setPipelines] = useState<PipelineOption[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const t = PIPELINE_THEMES[theme];

  // sincroniza quando o pai atualiza (polling)
  useEffect(() => setLocalOpportunities(opportunities), [opportunities]);

  // Lista de pipelines pra opção "mover pipeline" no card — busca uma vez, não muda com o polling
  useEffect(() => {
    fetch(`/api/agentes/${agentId}/pipelines`)
      .then(res => res.json())
      .then(data => setPipelines(data.pipelines ?? []))
      .catch(() => {});
  }, [agentId]);

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

  async function handleMarcarPerda(oppId: string) {
    const opp = localOpportunities.find(o => o.id === oppId);
    if (!opp) return;
    const res = await fetch(`/api/ferramentas/whatsapp/conversas/${opp.conversationId}/oportunidades/${oppId}/perda`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Não foi possível marcar como perda."); return; }
    setLocalOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, lostAt: data.opportunity.lostAt, stageId: data.opportunity.stageId } : o));
  }

  async function handleTransfer(conversationId: string, attendantId: string) {
    await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: attendantId }),
    });
    onOpportunitiesChange();
  }

  async function handleMovePipeline(oppId: string, stageId: string) {
    const opp = localOpportunities.find(o => o.id === oppId);
    if (!opp) return;
    // Some deste board na hora — a etapa de destino é de outro pipeline, não aparece mais aqui
    setLocalOpportunities(prev => prev.filter(o => o.id !== oppId));
    const res = await fetch(`/api/ferramentas/whatsapp/conversas/${opp.conversationId}/oportunidades/${oppId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    if (!res.ok) setLocalOpportunities(prev => [...prev, opp]); // falhou: devolve o card
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

  const activeOpp = activeId ? localOpportunities.find(o => o.id === activeId) : null;

  return (
    <>
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-3 h-full">
          {semEtapa.length > 0 && (
            <Column
              agentId={agentId}
              stage={{ id: "__sem_etapa__", name: "Sem etapa", color: "#6b7280", order: -1 }}
              opportunities={semEtapa}
              attendants={attendants}
              onClickCard={onSelectConversation}
              onRename={() => {}}
              onDelete={() => {}}
              onStagesChange={() => {}}
              onValueChange={handleValueChange}
              onLeadStatusChange={handleLeadStatusChange}
              onMarcarGanho={handleMarcarGanho}
              onMarcarPerda={handleMarcarPerda}
              onTransfer={handleTransfer}
              pipelines={pipelines}
              onMovePipeline={handleMovePipeline}
              onDeleteOpportunity={handleDeleteOpportunity}
              onOpenChat={setChatConversationId}
              onOpportunitiesChange={onOpportunitiesChange}
              leadStatuses={leadStatuses}
              onLeadStatusesChange={onLeadStatusesChange}
              dark={theme === "dark"}
              t={t}
            />
          )}
          {stages.map(stage => (
            <Column
              key={stage.id}
              agentId={agentId}
              stage={stage}
              opportunities={localOpportunities.filter(o => o.stageId === stage.id)}
              attendants={attendants}
              onClickCard={onSelectConversation}
              onRename={handleRename}
              onDelete={handleDelete}
              onStagesChange={onStagesChange}
              onValueChange={handleValueChange}
              onLeadStatusChange={handleLeadStatusChange}
              onMarcarGanho={handleMarcarGanho}
              onMarcarPerda={handleMarcarPerda}
              onTransfer={handleTransfer}
              pipelines={pipelines}
              onMovePipeline={handleMovePipeline}
              onDeleteOpportunity={handleDeleteOpportunity}
              onOpenChat={setChatConversationId}
              onOpportunitiesChange={onOpportunitiesChange}
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
