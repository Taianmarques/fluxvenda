"use client";

import { useRef, useState } from "react";
import { Target, Settings, Search, Upload, X, Download } from "lucide-react";

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

  // Import de planilha (CSV)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImport, setShowImport] = useState(false);
  const [csvRows, setCsvRows] = useState<{ nome: string; telefone: string; empresa: string; segmento: string; regiao: string }[]>([]);
  const [csvError, setCsvError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ novos: number; duplicatas: number } | null>(null);

  // Cadastro manual (1 contato)
  const [showManual, setShowManual] = useState(false);
  const [manNome, setManNome] = useState("");
  const [manEmpresa, setManEmpresa] = useState("");
  const [manTelefone, setManTelefone] = useState("");
  const [manSegmento, setManSegmento] = useState(initialSegmento);
  const [manRegiao, setManRegiao] = useState(initialRegiao);
  const [savingManual, setSavingManual] = useState(false);
  const [manError, setManError] = useState("");

  async function loadProspects() {
    const res = await fetch(`/api/agentes/${agentId}/prospects${filterStatus ? `?status=${filterStatus}` : ""}`);
    const d = await res.json();
    setProspects(d.prospects ?? []);
  }

  async function handleAddManual() {
    setManError("");
    if (!manNome.trim() || !manTelefone.trim()) { setManError("Nome e telefone são obrigatórios."); return; }
    setSavingManual(true);
    try {
      const res = await fetch(`/api/agentes/${agentId}/prospects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: manNome.trim(), empresa: manEmpresa.trim(),
          telefone: manTelefone.trim().replace(/\D/g, ""),
          segmento: manSegmento.trim(), regiao: manRegiao.trim(),
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setManError(d.error ?? "Erro ao salvar."); return; }
      setManNome(""); setManEmpresa(""); setManTelefone(""); setManError("");
      setShowManual(false);
      loadProspects();
    } finally { setSavingManual(false); }
  }

  function parseCSV(text: string) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    // detecta separador ; ou ,
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const colMap = {
      nome:      headers.findIndex(h => /nome|name|contato/.test(h)),
      telefone:  headers.findIndex(h => /tel|fone|phone|whatsapp|celular/.test(h)),
      empresa:   headers.findIndex(h => /empresa|company|negoc/.test(h)),
      segmento:  headers.findIndex(h => /segmento|segment|categoria|ramo/.test(h)),
      regiao:    headers.findIndex(h => /regiao|região|cidade|city|local/.test(h)),
    };
    return lines.slice(1).map(line => {
      const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ""));
      return {
        nome:     colMap.nome >= 0     ? (cols[colMap.nome]     ?? "") : "",
        telefone: colMap.telefone >= 0 ? (cols[colMap.telefone] ?? "") : "",
        empresa:  colMap.empresa >= 0  ? (cols[colMap.empresa]  ?? "") : "",
        segmento: colMap.segmento >= 0 ? (cols[colMap.segmento] ?? "") : initialSegmento,
        regiao:   colMap.regiao >= 0   ? (cols[colMap.regiao]   ?? "") : initialRegiao,
      };
    }).filter(r => r.nome || r.telefone);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setCsvError(""); setCsvRows([]); setImportResult(null);
    if (!file) return;
    if (!file.name.match(/\.(csv|txt)$/i)) {
      setCsvError("Selecione um arquivo CSV. Para Excel, exporte como CSV primeiro (Arquivo → Salvar como → CSV).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(reader.result as string);
      if (rows.length === 0) { setCsvError("Nenhuma linha válida encontrada. Verifique se o CSV tem colunas 'nome' e 'telefone'."); return; }
      setCsvRows(rows);
    };
    reader.onerror = () => setCsvError("Não foi possível ler o arquivo.");
    reader.readAsText(file, "UTF-8");
  }

  function downloadModeloCSV() {
    const csv = [
      "nome;telefone;empresa;segmento;regiao",
      "Ana Oliveira;11912345678;Clínica Sorriso;odontologia;São Paulo SP",
      "Carlos Mendes;11987654321;Estúdio Beleza;beleza;Campinas SP",
      "Maria Santos;11998765432;Farmácia Central;farmácia;Rio de Janeiro RJ",
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "modelo_prospects.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (csvRows.length === 0) return;
    setImporting(true); setImportResult(null);
    try {
      const res = await fetch(`/api/agentes/${agentId}/prospects/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospects: csvRows }),
      });
      const d = await res.json();
      if (!res.ok) { setCsvError(d.error ?? "Erro ao importar."); return; }
      setImportResult({ novos: d.novos, duplicatas: d.duplicatas });
      setCsvRows([]);
      loadProspects();
    } catch { setCsvError("Falha na conexão."); }
    finally { setImporting(false); }
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
          <button onClick={() => { setShowImport(s => !s); setShowManual(false); setShowSettings(false); }} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5">
            <Upload size={15} /> Importar planilha
          </button>
          <button onClick={() => { setShowManual(s => !s); setShowImport(false); setShowSettings(false); }} className="bg-gray-700 hover:bg-gray-600 rounded-xl px-4 py-2.5 text-sm font-medium">
            + Adicionar 1
          </button>
          <button onClick={() => { setShowSettings(s => !s); setShowManual(false); }} className="bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5">
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

        {/* Import de planilha */}
        {showImport && (
          <div className="bg-gray-900 border border-blue-800/50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Importar planilha de prospects</p>
              <button onClick={() => { setShowImport(false); setCsvRows([]); setCsvError(""); setImportResult(null); }} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm text-gray-400 space-y-1">
              <p className="text-gray-300 font-medium">Formato esperado (CSV):</p>
              <p>O arquivo deve ter colunas com esses nomes (em qualquer ordem, separadas por <code className="text-gray-300">,</code> ou <code className="text-gray-300">;</code>):</p>
              <p><code className="text-white">nome</code> e <code className="text-white">telefone</code> — obrigatórios</p>
              <p><code className="text-gray-300">empresa</code>, <code className="text-gray-300">segmento</code>, <code className="text-gray-300">regiao</code> — opcionais</p>
              <p className="text-xs text-gray-500 mt-1">Para Excel: Arquivo → Salvar como → CSV (separado por vírgulas).</p>
              <button onClick={downloadModeloCSV} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-2">
                <Download size={13} /> Baixar modelo de planilha
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileSelected} className="hidden" />
            {csvRows.length === 0 && !importResult && (
              <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-700 hover:border-blue-600 rounded-xl py-8 text-sm text-gray-400 hover:text-blue-400 transition-colors flex flex-col items-center gap-2">
                <Upload size={24} />
                Clique para selecionar o arquivo CSV
              </button>
            )}

            {csvError && <p className="text-sm text-red-400">{csvError}</p>}

            {csvRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-300">{csvRows.length} contato(s) encontrados no arquivo:</p>
                  <button onClick={() => { setCsvRows([]); setCsvError(""); }} className="text-xs text-gray-500 hover:text-gray-300">Limpar</button>
                </div>
                <div className="bg-gray-950 rounded-xl overflow-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left px-3 py-2">Nome</th>
                      <th className="text-left px-3 py-2">Telefone</th>
                      <th className="text-left px-3 py-2">Empresa</th>
                      <th className="text-left px-3 py-2">Segmento</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-900">
                      {csvRows.slice(0, 8).map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 truncate max-w-[150px]">{r.nome}</td>
                          <td className="px-3 py-1.5">{r.telefone}</td>
                          <td className="px-3 py-1.5 truncate max-w-[120px] text-gray-500">{r.empresa}</td>
                          <td className="px-3 py-1.5 text-gray-500">{r.segmento}</td>
                        </tr>
                      ))}
                      {csvRows.length > 8 && <tr><td colSpan={4} className="px-3 py-1.5 text-gray-600">… e mais {csvRows.length - 8} contatos</td></tr>}
                    </tbody>
                  </table>
                </div>
                <button onClick={handleImport} disabled={importing} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
                  {importing ? "Importando..." : `Importar ${csvRows.length} contatos`}
                </button>
              </div>
            )}

            {importResult && (
              <p className="text-sm text-green-400">
                {importResult.novos} contato(s) importado(s) com sucesso!{importResult.duplicatas > 0 ? ` (${importResult.duplicatas} já existiam e foram ignorados)` : ""}
              </p>
            )}
          </div>
        )}

        {/* Cadastro manual */}
        {showManual && (
          <div className="bg-gray-900 border border-blue-800/50 rounded-2xl p-5 space-y-3">
            <p className="font-semibold">Adicionar prospect manualmente</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input value={manNome} onChange={e => setManNome(e.target.value)} placeholder="Nome do contato *" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm md:col-span-2" />
              <input value={manTelefone} onChange={e => setManTelefone(e.target.value)} placeholder="Telefone/WhatsApp *" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input value={manEmpresa} onChange={e => setManEmpresa(e.target.value)} placeholder="Empresa (opcional)" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input value={manSegmento} onChange={e => setManSegmento(e.target.value)} placeholder="Segmento" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input value={manRegiao} onChange={e => setManRegiao(e.target.value)} placeholder="Região/Cidade" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            </div>
            {manError && <p className="text-sm text-red-400">{manError}</p>}
            <div className="flex gap-2">
              <button onClick={handleAddManual} disabled={savingManual} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium">
                {savingManual ? "Salvando..." : "Salvar prospect"}
              </button>
              <button onClick={() => { setShowManual(false); setManError(""); }} className="text-sm text-gray-400 hover:text-white">Cancelar</button>
            </div>
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
