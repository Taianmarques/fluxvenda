"use client";

import { useEffect, useRef } from "react";
import type { LeadStatus } from "./LeadStatusBadge";
import type { Stage, PipelineOpportunity } from "./WhatsappPipeline";

export type Attendant = { id: string; name: string; isManager: boolean };

export type PipelineFilters = {
  attendantId: string | null; // null = todos, "__none__" = sem atendente
  leadStatusId: string | null; // null = todos
  search: string;
  stageIds: string[]; // vazio = todas as etapas
  minValue: string;
  maxValue: string;
  startDate: string; // aberta a partir de (createdAt) — yyyy-mm-dd
  endDate: string; // aberta até
  status: "all" | "open" | "won";
};

export const EMPTY_PIPELINE_FILTERS: PipelineFilters = {
  attendantId: null,
  leadStatusId: null,
  search: "",
  stageIds: [],
  minValue: "",
  maxValue: "",
  startDate: "",
  endDate: "",
  status: "all",
};

export function hasActivePipelineFilters(f: PipelineFilters): boolean {
  return (
    f.attendantId !== null ||
    f.leadStatusId !== null ||
    f.search.trim() !== "" ||
    f.stageIds.length > 0 ||
    f.minValue !== "" ||
    f.maxValue !== "" ||
    f.startDate !== "" ||
    f.endDate !== "" ||
    f.status !== "all"
  );
}

export function applyPipelineFilters(opportunities: PipelineOpportunity[], f: PipelineFilters): PipelineOpportunity[] {
  if (!hasActivePipelineFilters(f)) return opportunities;
  const q = f.search.trim().toLowerCase();
  const min = f.minValue.trim() ? Number(f.minValue.replace(",", ".")) : null;
  const max = f.maxValue.trim() ? Number(f.maxValue.replace(",", ".")) : null;
  const start = f.startDate ? new Date(f.startDate) : null;
  const end = f.endDate ? new Date(`${f.endDate}T23:59:59`) : null;

  return opportunities.filter(o => {
    if (f.attendantId === "__none__" && o.assignedToId) return false;
    if (f.attendantId && f.attendantId !== "__none__" && o.assignedToId !== f.attendantId) return false;
    if (f.leadStatusId && o.leadStatusId !== f.leadStatusId) return false;
    if (q) {
      const matches =
        (o.contactName ?? "").toLowerCase().includes(q) ||
        o.contactNumber.toLowerCase().includes(q) ||
        (o.title ?? "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (f.stageIds.length > 0 && (!o.stageId || !f.stageIds.includes(o.stageId))) return false;
    if (min !== null && Number.isFinite(min) && o.dealValue < min) return false;
    if (max !== null && Number.isFinite(max) && o.dealValue > max) return false;
    if (start && new Date(o.createdAt) < start) return false;
    if (end && new Date(o.createdAt) > end) return false;
    if (f.status === "open" && o.wonAt) return false;
    if (f.status === "won" && !o.wonAt) return false;
    return true;
  });
}

export function PipelineFiltersPanel({
  filters, onChange, attendants, leadStatuses, stages, onClose, dark,
}: {
  filters: PipelineFilters;
  onChange: (f: PipelineFilters) => void;
  attendants: Attendant[];
  leadStatuses: LeadStatus[];
  stages: Stage[];
  onClose: () => void;
  dark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const inputClass = `w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none ${dark ? "bg-gray-950 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`;
  const labelClass = `text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`;
  const checkboxRowClass = `flex items-center gap-2 text-xs ${dark ? "text-gray-300" : "text-gray-700"}`;

  function toggleStage(stageId: string) {
    onChange({
      ...filters,
      stageIds: filters.stageIds.includes(stageId)
        ? filters.stageIds.filter(id => id !== stageId)
        : [...filters.stageIds, stageId],
    });
  }

  return (
    <div
      ref={ref}
      className={`absolute top-full right-0 mt-1 rounded-xl border shadow-xl z-20 w-72 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto p-3 space-y-3 ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
    >
      <div>
        <p className={labelClass}>Buscar</p>
        <input
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder="Nome, número ou título..."
          className={`mt-1 ${inputClass}`}
        />
      </div>

      <div>
        <p className={labelClass}>Atendente</p>
        <select
          value={filters.attendantId ?? ""}
          onChange={e => onChange({ ...filters, attendantId: e.target.value || null })}
          className={`mt-1 ${inputClass}`}
        >
          <option value="">Todos</option>
          <option value="__none__">Sem atendente</option>
          {attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div>
        <p className={labelClass}>Status do lead</p>
        <select
          value={filters.leadStatusId ?? ""}
          onChange={e => onChange({ ...filters, leadStatusId: e.target.value || null })}
          className={`mt-1 ${inputClass}`}
        >
          <option value="">Todos</option>
          {leadStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div>
        <p className={labelClass}>Oportunidade</p>
        <select
          value={filters.status}
          onChange={e => onChange({ ...filters, status: e.target.value as PipelineFilters["status"] })}
          className={`mt-1 ${inputClass}`}
        >
          <option value="all">Todas</option>
          <option value="open">Só abertas</option>
          <option value="won">Só ganhas</option>
        </select>
      </div>

      <div>
        <p className={labelClass}>Valor (R$)</p>
        <div className="flex items-center gap-2 mt-1">
          <input
            value={filters.minValue}
            onChange={e => onChange({ ...filters, minValue: e.target.value })}
            placeholder="Mín."
            inputMode="decimal"
            className={inputClass}
          />
          <span className={labelClass}>até</span>
          <input
            value={filters.maxValue}
            onChange={e => onChange({ ...filters, maxValue: e.target.value })}
            placeholder="Máx."
            inputMode="decimal"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <p className={labelClass}>Aberta no período</p>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="date"
            value={filters.startDate}
            onChange={e => onChange({ ...filters, startDate: e.target.value })}
            className={inputClass}
          />
          <span className={labelClass}>até</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={e => onChange({ ...filters, endDate: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      {stages.length > 0 && (
        <div>
          <p className={labelClass}>Etapas</p>
          <div className="space-y-1 mt-1">
            {stages.map(s => (
              <label key={s.id} className={checkboxRowClass}>
                <input type="checkbox" checked={filters.stageIds.includes(s.id)} onChange={() => toggleStage(s.id)} />
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                {s.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {hasActivePipelineFilters(filters) && (
        <button onClick={() => onChange(EMPTY_PIPELINE_FILTERS)} className="text-xs font-medium text-blue-400 hover:text-blue-300">
          Limpar filtros
        </button>
      )}
    </div>
  );
}
