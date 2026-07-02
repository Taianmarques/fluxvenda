"use client";

import { useState } from "react";
import { Target, Settings, Search } from "lucide-react";

type Prospect = {
  id: string; nome: string; empresa: string; telefone: string;
  segmento: string; regiao: string; status: string; notas: string;
  abordagemCount: number; lastAbordagemAt: string | null; createdAt: string;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  NOVO:              { label: "Novo",            color: "bg-gray-800 text-gray-400 border-gray-700" },
  ABORDADO:          { label: "Abordado",         color: "bg-blue-900/40 text-blue-300 border-blue-800/50" },
  RESPONDEU:         { label: "Respondeu",         color: "bg-yellow-900/40 text-yellow-300 border-yellow-800/50" },
  QUALIFICADO:       { label: "Qualificado",       color: "bg-green-900/40 text-green-300 border-green-800/50" },
  REUNIAO_AGENDADA:  { label: "Reunião agendada", color: "bg-purple-900/40 text-purple-300 border-purple-800/50" },
  DESCARTADO:        { label: "Descartado",        color: "bg-red-900/40 text-red-300 border-red-800/50" },
  ENCERRADO:         { label: "Encerrado",         color: "bg-gray-800 text-gray-500 border-gray-700" },
};

const ALL_STATUSES = Object.keys(STATUS_LABEL);

export function ProspeccaoClient({
  agentId, initialProspeccaoEnabled, initialSegmento, initialRegiao,
  initialMensagemInicial, initialFollowupDias, initialProspects,
}: {
  agentId: string;
  initialProspeccaoEnabled: boolean;
  initialSegmento: string;
  initialRegiao: string;
  initialMensagemInicial: string;
  initialFollowupDias: number[];
  initialProspects: Prospect[];
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [prospeccaoEnabled, setProspeccaoEnabled] = useState(initialProspeccaoEnabled);
  const [segmento, setSegmento] = useState(initialSegmento);
  const [regiao, setRegiao] = useState(initialRegiao);
  const [mensagemInicial, setMensagemInicial] = useState(initialMensagemInicial);
  const [followupDias, setFollowupDias] = useState(initialFollowupDias.join(", "));
  const [savingSettings, setSavingSettings] = useState(false);

  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [scraping, setScraping] = useState(false);
  const [scrapeSegmento, setScrapeSegmento] = useState(initialSegmento);
  const [scrapeRegiao, setScrapeRegiao] = useState(initialRegiao);
  const [scrapeMax, setScrapeMax] = useState(20);
  const [scrapeResult, setScrapeResult] = useState<{ novos: number; duplicatas: number } | null>(null);
  const [scrapeError, setScrapeError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  async function loadProspects() {
    const res = await fetch(`/api/agentes/${agentId}/prospects${filterStatus ? `?status=${filterStatus}` : ""}`);
    const d = await res.json();
    setProspects(d.prospects ?? []);
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const dias = followupDias.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
      await fetch(`/api/agentes/${agentId}/prospeccao`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospeccaoEnabled, prospeccaoSegmento: segmento, prospeccaoRegiao: regiao,
          prospeccaoMensagemInicial: mensagemInicial, prospeccaoFollowupDias: dias,
        }),
      });
    } finally { setSavingSettings(false); }
  }

  async function handleScrape() {
    setScrapeError(""); setScrapeResult(null); setScraping(true);
    try {
      const res = await fetch(`/api/agentes/${agentId}/prospectar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmento: scrapeSegmento, regiao: scrapeRegiao, maxResults: scrapeMax }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setScrapeError(d.error ?? "Erro ao buscar prospects.");
        return;
      }
      const d = await res.json();
      setScrapeResult({ novos: d.novos, duplicatas: d.duplicatas });
      loadProspects();
    } catch { setScrapeError("Falha na conexão."); }
    finally { setScraping(false); }
  }

  async function handleUpdateStatus(id: string, status: string) {
    await fetch(`/api/ferramentas/whatsapp/prospects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadProspects();
  }

  const stats = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = prospects.filter(p => p.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const displayed = filterStatus ? prospects.filter(p => p.status === filterStatus) : prospects;

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm">Atendimento</p>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><Target size={28} className="text-blue-400" /> Prospecção</h1>
          </div>
          <button onClick={() => setShowSettings(s => !s)} className="bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5">
            <Settings size={15} /> Configurar
          </button>
        </div>

        {showSettings && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={prospeccaoEnabled} onChange={e => setProspeccaoEnabled(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-medium">Ativar agente de prospecção</span>
            </label>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Segmento padrão</label>
                <input value={segmento} onChange={e => setSegmento(e.target.value)} placeholder="Ex: dentistas" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Região padrão</label>
                <input value={regiao} onChange={e => setRegiao(e.target.value)} placeholder="Ex: São Paulo SP" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Mensagem inicial (use {"{nome}"}, {"{empresa}"}, {"{segmento}"})</label>
              <textarea value={mensagemInicial} onChange={e => setMensagemInicial(e.target.value)} rows={3}
                placeholder="Olá {nome}! Vi que vocês atuam com {segmento} em nossa região..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Cadência de follow-up (dias separados por vírgula)</label>
              <input value={followupDias} onChange={e => setFollowupDias(e.target.value)} placeholder="3, 7, 14" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <p className="text-xs text-gray-500 mt-1">Ex: "3, 7, 14" = follow-up 3 dias depois, depois mais 7, depois mais 14.</p>
            </div>
            <button onClick={handleSaveSettings} disabled={savingSettings} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
              {savingSettings ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        )}

        {/* Buscar prospects */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <p className="font-semibold flex items-center gap-2"><Search size={16} /> Buscar prospects no Google Maps</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input value={scrapeSegmento} onChange={e => setScrapeSegmento(e.target.value)} placeholder="Segmento" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm md:col-span-2" />
            <input value={scrapeRegiao} onChange={e => setScrapeRegiao(e.target.value)} placeholder="Cidade/região" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            <input type="number" min={1} max={50} value={scrapeMax} onChange={e => setScrapeMax(Math.min(50, Math.max(1, Number(e.target.value))))} placeholder="Qtde" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
          </div>
          <button onClick={handleScrape} disabled={scraping || !scrapeSegmento || !scrapeRegiao} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
            {scraping ? "Buscando (pode levar 1-2 min)..." : "Buscar prospects"}
          </button>
          {scrapeResult && <p className="text-sm text-green-400">{scrapeResult.novos} novos prospects encontrados ({scrapeResult.duplicatas} já existiam).</p>}
          {scrapeError && <p className="text-sm text-red-400">{scrapeError}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {ALL_STATUSES.map(s => {
            const st = STATUS_LABEL[s];
            return (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
                className={`rounded-xl border p-3 text-center transition-colors cursor-pointer ${filterStatus === s ? "border-blue-600 bg-blue-950/30" : "border-gray-800 bg-gray-900 hover:border-gray-700"}`}>
                <p className={`text-xl font-bold ${st.color.split(" ")[1]}`}>{stats[s] ?? 0}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{st.label}</p>
              </button>
            );
          })}
        </div>

        {/* Lista */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <p className="font-semibold p-5 pb-3">
            Prospects {filterStatus ? `(${STATUS_LABEL[filterStatus]?.label})` : `(${prospects.length})`}
          </p>
          {displayed.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 pb-5">Nenhum prospect encontrado.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {displayed.map(p => {
                const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.NOVO;
                return (
                  <div key={p.id} className="px-5 py-3 space-y-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium">{p.nome}{p.empresa && p.empresa !== p.nome ? ` · ${p.empresa}` : ""}</p>
                        <p className="text-xs text-gray-500">{p.telefone} · {p.segmento} · {p.regiao}</p>
                        {p.notas && <p className="text-xs text-gray-400 mt-0.5 italic">{p.notas}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                        <span className="text-xs text-gray-600">{p.abordagemCount > 0 ? `${p.abordagemCount}x abordado` : ""}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs pt-1">
                      {p.status !== "QUALIFICADO" && p.status !== "REUNIAO_AGENDADA" && (
                        <button onClick={() => handleUpdateStatus(p.id, "QUALIFICADO")} className="text-green-400 hover:text-green-300">Qualificado</button>
                      )}
                      {p.status !== "DESCARTADO" && (
                        <button onClick={() => handleUpdateStatus(p.id, "DESCARTADO")} className="text-red-400 hover:text-red-300">Descartar</button>
                      )}
                      {p.status === "DESCARTADO" && (
                        <button onClick={() => handleUpdateStatus(p.id, "NOVO")} className="text-gray-400 hover:text-white">Reativar</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
