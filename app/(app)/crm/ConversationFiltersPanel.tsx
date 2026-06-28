"use client";

import { useEffect, useRef } from "react";
import type { LeadStatus } from "./LeadStatusBadge";

export type Attendant = { id: string; name: string; isManager: boolean };

export type ConversationFilters = {
  attendantId: string | null; // null = todos, "__none__" = sem atendente
  leadStatusId: string | null; // null = todos
  onlyOpenOpportunity: boolean;
  onlyUnanswered: boolean;
  onlyUnread: boolean;
};

export const EMPTY_FILTERS: ConversationFilters = {
  attendantId: null,
  leadStatusId: null,
  onlyOpenOpportunity: false,
  onlyUnanswered: false,
  onlyUnread: false,
};

export function hasActiveFilters(f: ConversationFilters): boolean {
  return f.attendantId !== null || f.leadStatusId !== null || f.onlyOpenOpportunity || f.onlyUnanswered || f.onlyUnread;
}

export function ConversationFiltersPanel({
  filters, onChange, attendants, leadStatuses, onClose, dark,
}: {
  filters: ConversationFilters;
  onChange: (f: ConversationFilters) => void;
  attendants: Attendant[];
  leadStatuses: LeadStatus[];
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

  const selectClass = `w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none ${dark ? "bg-gray-950 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`;
  const labelClass = `text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`;
  const checkboxRowClass = `flex items-center gap-2 text-xs ${dark ? "text-gray-300" : "text-gray-700"}`;

  return (
    <div
      ref={ref}
      className={`absolute top-full left-0 mt-1 rounded-xl border shadow-xl z-20 w-64 p-3 space-y-3 ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
    >
      <div>
        <p className={labelClass}>Atendente</p>
        <select
          value={filters.attendantId ?? ""}
          onChange={e => onChange({ ...filters, attendantId: e.target.value || null })}
          className={`mt-1 ${selectClass}`}
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
          className={`mt-1 ${selectClass}`}
        >
          <option value="">Todos</option>
          {leadStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="space-y-1.5 pt-1">
        <label className={checkboxRowClass}>
          <input type="checkbox" checked={filters.onlyOpenOpportunity} onChange={e => onChange({ ...filters, onlyOpenOpportunity: e.target.checked })} />
          Com oportunidade aberta
        </label>
        <label className={checkboxRowClass}>
          <input type="checkbox" checked={filters.onlyUnanswered} onChange={e => onChange({ ...filters, onlyUnanswered: e.target.checked })} />
          Não respondidas
        </label>
        <label className={checkboxRowClass}>
          <input type="checkbox" checked={filters.onlyUnread} onChange={e => onChange({ ...filters, onlyUnread: e.target.checked })} />
          Não lidas
        </label>
      </div>

      {hasActiveFilters(filters) && (
        <button onClick={() => onChange(EMPTY_FILTERS)} className="text-xs font-medium text-blue-400 hover:text-blue-300">
          Limpar filtros
        </button>
      )}
    </div>
  );
}
