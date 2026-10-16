"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, MapPin } from "lucide-react";
import type { Opportunity } from "./OpportunitiesPanel";

// Seletor de etapa do pipeline no cabeçalho do chat: mostra "Funil › Etapa" da negociação em
// aberto e move com um clique (PATCH da oportunidade — a rota reinicia a nutrição da etapa nova).
// Sem negociação aberta, escolher uma etapa cria a oportunidade já nela.

type PipelineStage = { id: string; name: string };
type Pipeline = { id: string; name: string; stages: PipelineStage[] };

// Pipelines do agente mudam pouco — carrega uma vez por agente enquanto a página está aberta
const pipelinesCache = new Map<string, Pipeline[]>();

export function StageSelector({
  conversationId, agentId, opportunities, onChange, dark,
}: {
  conversationId: string;
  agentId: string;
  opportunities: Opportunity[];
  onChange: () => void;
  dark: boolean;
}) {
  const abertas = opportunities.filter(o => !o.wonAt);
  const [pipelines, setPipelines] = useState<Pipeline[] | null>(pipelinesCache.get(agentId) ?? null);
  const [open, setOpen] = useState(false);
  const [oppId, setOppId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Negociação alvo: a escolhida no menu, senão a aberta mais recente
  const alvo = abertas.find(o => o.id === oppId) ?? abertas[abertas.length - 1] ?? null;

  useEffect(() => {
    if (pipelines) return;
    let vivo = true;
    fetch(`/api/agentes/${agentId}/pipelines`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const list: Pipeline[] = Array.isArray(data?.pipelines) ? data.pipelines : Array.isArray(data) ? data : [];
        pipelinesCache.set(agentId, list);
        if (vivo) setPipelines(list);
      })
      .catch(() => { if (vivo) setPipelines([]); });
    return () => { vivo = false; };
  }, [agentId, pipelines]);

  useEffect(() => {
    if (!open) return;
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [open]);

  if (!pipelines || pipelines.every(p => p.stages.length === 0)) return null;

  const atual = alvo?.stageId
    ? pipelines.flatMap(p => p.stages.map(s => ({ pipeline: p, stage: s }))).find(x => x.stage.id === alvo.stageId)
    : undefined;

  async function mover(stageId: string) {
    if (saving) return;
    if (alvo && alvo.stageId === stageId) { setOpen(false); return; }
    setSaving(stageId);
    setError(null);
    try {
      const res = alvo
        ? await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}/oportunidades/${alvo.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageId }),
          })
        : await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}/oportunidades`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageId, dealValue: 0 }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível mudar a etapa.");
        return;
      }
      setOpen(false);
      onChange();
    } finally {
      setSaving(null);
    }
  }

  const multiplosFunis = pipelines.filter(p => p.stages.length > 0).length > 1;
  const rotulo = atual
    ? `${multiplosFunis ? `${atual.pipeline.name} › ` : ""}${atual.stage.name}`
    : alvo ? "Sem etapa" : "Colocar no funil";

  return (
    <div className="relative inline-block mt-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Mudar etapa do pipeline"
        className={`flex items-center gap-1 max-w-[220px] text-[11px] font-semibold rounded-full px-2 py-0.5 border ${
          atual
            ? dark ? "border-blue-700/60 bg-blue-900/30 text-blue-300" : "border-blue-200 bg-blue-50 text-blue-700"
            : dark ? "border-gray-700 text-gray-400" : "border-gray-300 text-gray-500"
        }`}
      >
        <MapPin size={11} className="flex-shrink-0" />
        <span className="truncate">{rotulo}</span>
        <ChevronDown size={11} className="flex-shrink-0" />
      </button>

      {open && (
        <div
          className={`max-md:fixed max-md:inset-x-3 max-md:top-28 md:absolute md:top-full md:left-0 md:mt-1 md:w-64 rounded-xl border shadow-xl z-30 max-h-80 overflow-y-auto p-1.5 ${
            dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          {abertas.length > 1 && (
            <select
              value={alvo?.id ?? ""}
              onChange={e => setOppId(e.target.value)}
              className={`w-full mb-1.5 text-xs rounded-lg px-2 py-1.5 border ${dark ? "bg-gray-950 border-gray-700 text-gray-200" : "bg-white border-gray-300 text-gray-800"}`}
            >
              {abertas.map(o => <option key={o.id} value={o.id}>{o.title || "Negociação"} — {o.dealValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</option>)}
            </select>
          )}
          {!alvo && (
            <p className={`text-[11px] px-2 pb-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>Sem negociação aberta — escolher uma etapa cria uma.</p>
          )}
          {pipelines.filter(p => p.stages.length > 0).map(p => (
            <div key={p.id} className="mb-1">
              {multiplosFunis && (
                <p className={`text-[10px] uppercase tracking-wide font-semibold px-2 pt-1 pb-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>{p.name}</p>
              )}
              {p.stages.map(s => {
                const ativa = alvo?.stageId === s.id;
                return (
                  <button
                    key={s.id} type="button" onClick={() => mover(s.id)} disabled={Boolean(saving)}
                    className={`w-full flex items-center gap-2 text-left text-xs rounded-lg px-2 py-1.5 ${
                      ativa
                        ? "bg-blue-600 text-white"
                        : dark ? "text-gray-200 hover:bg-gray-800" : "text-gray-800 hover:bg-gray-100"
                    }`}
                  >
                    <span className="flex-1 truncate">{s.name}</span>
                    {saving === s.id ? <Loader2 size={12} className="animate-spin" /> : ativa ? <Check size={12} /> : null}
                  </button>
                );
              })}
            </div>
          ))}
          {error && <p className="text-[11px] text-red-400 px-2 pt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}
