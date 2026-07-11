"use client";

import { useEffect, useRef, useState } from "react";
import { Megaphone, Plus, X, Sparkles, MessageSquareText, Pause, Play, Ban, Users, Clock, ShieldCheck, Upload, FileSpreadsheet, Filter as FilterIcon, KanbanSquare, Star, UserSquare2, Globe2, User } from "lucide-react";
import { parseCsv, downloadCsvTemplate } from "@/lib/csv-parser";
import { NIVEL_META, type Nivel } from "../carteira/CarteiraClient";

const CSV_TEMPLATE_CONTATOS = "nome;telefone\nMaria Silva;11987654321\nJoão Souza;21998765432\n";

type PipelineStage = { id: string; name: string; color: string };
type Pipeline = { id: string; name: string; stages: PipelineStage[] };
type Atendente = { id: string; name: string };

type MessageTemplate = {
  name: string;
  status: string;
  language: string;
  category: string;
  components: { type: string; text?: string; format?: string }[];
};

type Campanha = {
  id: string;
  nome: string;
  modo: "NORMAL" | "IA_VARIACAO";
  status: "ENVIANDO" | "PAUSADA" | "CONCLUIDA" | "CANCELADA";
  mensagem: string;
  origemMensagem?: "TEXTO_LIVRE" | "TEMPLATE_META";
  templateName?: string | null;
  createdAt: string;
  total: number;
  enviados: number;
  erros: number;
};

// Conta quantas variáveis {{1}}, {{2}}... o corpo do template usa
function countTemplateVars(template: MessageTemplate): number {
  const body = template.components.find(c => c.type === "BODY")?.text ?? "";
  const matches = body.match(/\{\{(\d+)\}\}/g) ?? [];
  return new Set(matches).size;
}

const STATUS_LABEL: Record<Campanha["status"], { label: string; color: string }> = {
  ENVIANDO: { label: "Enviando", color: "bg-green-900/40 text-green-300 border-green-800/50" },
  PAUSADA: { label: "Pausada", color: "bg-amber-900/40 text-amber-300 border-amber-800/50" },
  CONCLUIDA: { label: "Concluída", color: "bg-gray-800 text-gray-400 border-gray-700" },
  CANCELADA: { label: "Cancelada", color: "bg-red-900/40 text-red-300 border-red-800/50" },
};

const RITMOS = [
  { key: "seguro", label: "Seguro", desc: "1 a 3 min entre envios — menor risco de bloqueio, recomendado" },
  { key: "moderado", label: "Moderado", desc: "30s a 1,5 min entre envios" },
  { key: "rapido", label: "Rápido", desc: "15 a 45s entre envios — só para listas pequenas e números aquecidos" },
] as const;

export function CampanhasClient({ agentId, isCloudApi = false }: { agentId: string; isCloudApi?: boolean }) {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  // Formulário
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [modo, setModo] = useState<"NORMAL" | "IA_VARIACAO">("NORMAL");
  const [instrucoesIA, setInstrucoesIA] = useState("");
  const [ritmo, setRitmo] = useState<"seguro" | "moderado" | "rapido">("seguro");

  // Template aprovado da Meta — obrigatório quando o agente usa a API oficial (WhatsApp Cloud API)
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [templateName, setTemplateName] = useState<string>("");
  const [templateVars, setTemplateVars] = useState<string[]>([]);
  const selectedTemplate = templates.find(t => t.name === templateName) ?? null;
  const [compradores, setCompradores] = useState<"todos" | "sim" | "nao">("todos");
  const [inatividade, setInatividade] = useState<"qualquer" | "7d" | "30d" | "60d">("qualquer");
  const [stageId, setStageId] = useState<string>("");
  const [nivel, setNivel] = useState<Nivel | "">("");
  const [atendenteId, setAtendenteId] = useState<string>("");
  const [criando, setCriando] = useState(false);

  // Opções dos filtros (carregadas uma vez, junto com as campanhas)
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);

  // Fonte do público: filtros do CRM (padrão) ou planilha importada
  const [fontePublico, setFontePublico] = useState<"filtros" | "importar">("filtros");
  const [contatosImportados, setContatosImportados] = useState<{ contactNumber: string; contactName: string }[]>([]);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSelectPlanilha(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(String(reader.result ?? ""));
        const parsed = rows.map(r => {
          const contactNumber = (r.telefone || r.phone || r.numero || r.whatsapp || "").replace(/\D/g, "");
          const contactName = r.nome || r.name || r.contato || "";
          if (contactNumber.length < 8) return null;
          return { contactNumber, contactName };
        }).filter((c): c is { contactNumber: string; contactName: string } => c !== null);

        if (parsed.length === 0) {
          setImportError("Nenhum telefone válido encontrado. Confira se a planilha tem uma coluna \"telefone\" (baixe o modelo).");
          setContatosImportados([]);
          return;
        }
        if (parsed.length > 500) {
          setImportError(`A planilha tem ${parsed.length} contatos — só os 500 primeiros serão usados.`);
        }
        setContatosImportados(parsed.slice(0, 500));
      } catch {
        setImportError("Não foi possível ler o arquivo. Confira se é um CSV válido.");
        setContatosImportados([]);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  async function loadCampanhas() {
    try {
      const res = await fetch(`/api/agentes/${agentId}/campanhas`);
      const data = await res.json();
      setCampanhas(data.campanhas ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadOpcoesFiltro() {
    const [pRes, aRes] = await Promise.all([
      fetch(`/api/agentes/${agentId}/pipelines`),
      fetch(`/api/agentes/${agentId}/atendentes`),
    ]);
    const [pData, aData] = await Promise.all([pRes.json(), aRes.json()]);
    setPipelines(pData.pipelines ?? []);
    setAtendentes(aData.attendants ?? []);
  }

  async function loadTemplates() {
    setLoadingTemplates(true);
    setTemplateError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/whatsapp-cloud/templates`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar templates.");
      setTemplates(data.templates ?? []);
    } catch (e: any) {
      setTemplateError(e.message);
    } finally {
      setLoadingTemplates(false);
    }
  }

  function selectTemplate(name: string) {
    setTemplateName(name);
    const t = templates.find(tpl => tpl.name === name);
    setTemplateVars(t ? Array(countTemplateVars(t)).fill("") : []);
  }

  useEffect(() => {
    loadCampanhas();
    loadOpcoesFiltro();
    if (isCloudApi) loadTemplates();
    const interval = setInterval(() => { if (!document.hidden) loadCampanhas(); }, 8000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCriar() {
    if (!nome.trim()) {
      setError("Preencha o nome da campanha.");
      return;
    }
    if (isCloudApi && !selectedTemplate) {
      setError("Selecione um template aprovado.");
      return;
    }
    if (!isCloudApi && !mensagem.trim()) {
      setError("Preencha a mensagem.");
      return;
    }
    if (fontePublico === "importar" && contatosImportados.length === 0) {
      setError("Importe uma planilha com pelo menos um contato válido.");
      return;
    }
    setCriando(true);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/campanhas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          ritmo,
          ...(isCloudApi
            ? {
                origemMensagem: "TEMPLATE_META",
                mensagem: `[Template] ${selectedTemplate!.name}`,
                templateName: selectedTemplate!.name,
                templateLanguage: selectedTemplate!.language,
                templateVariaveis: templateVars,
              }
            : { origemMensagem: "TEXTO_LIVRE", mensagem: mensagem.trim(), modo, instrucoesIA: instrucoesIA.trim() }),
          ...(fontePublico === "importar"
            ? { contatosImportados }
            : { filtros: { compradores, inatividade, stageId: stageId || null, nivel: nivel || null, atendenteId: atendenteId || null } }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar campanha.");
      setNome(""); setMensagem(""); setInstrucoesIA(""); setModo("NORMAL"); setRitmo("seguro");
      setCompradores("todos"); setInatividade("qualquer"); setStageId(""); setNivel(""); setAtendenteId("");
      setTemplateName(""); setTemplateVars([]);
      setShowForm(false);
      setFontePublico("filtros"); setContatosImportados([]); setImportError("");
      loadCampanhas();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCriando(false);
    }
  }

  async function handleStatus(c: Campanha, status: "ENVIANDO" | "PAUSADA" | "CANCELADA") {
    if (status === "CANCELADA" && !confirm(`Cancelar a campanha "${c.nome}"? Os envios pendentes não serão feitos.`)) return;
    await fetch(`/api/agentes/${agentId}/campanhas/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadCampanhas();
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-gray-400 text-sm">Gestão</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <Megaphone size={26} className="text-blue-400" /> Campanhas
            </h1>
            <p className="text-sm text-gray-500 mt-1">Disparo em massa pelo WhatsApp com intervalo aleatório entre envios, para proteger o número.</p>
          </div>
          <button
            onClick={() => { setShowForm(s => !s); setError(""); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            <Plus size={15} /> Nova campanha
          </button>
        </div>

        {error && !showForm && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm rounded-xl px-4 py-3 flex items-start justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError("")} className="flex-shrink-0 text-red-400 hover:text-red-200"><X size={14} /></button>
          </div>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-blue-800/40 rounded-2xl p-5 space-y-4">
            <p className="font-semibold text-sm">Nova campanha</p>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Nome (uso interno)</label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Promoção de julho"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                maxLength={60}
              />
            </div>

            {isCloudApi ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-blue-300 bg-blue-950/30 border border-blue-800/40 rounded-xl px-3 py-2">
                  <Globe2 size={13} className="flex-shrink-0" />
                  API oficial da Meta: campanhas só podem usar templates aprovados.
                </div>

                {loadingTemplates && <p className="text-sm text-gray-500">Buscando templates aprovados...</p>}
                {templateError && <p className="text-sm text-red-400">{templateError}</p>}

                {!loadingTemplates && !templateError && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Template aprovado</label>
                    <select
                      value={templateName}
                      onChange={e => selectTemplate(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="">Selecione um template...</option>
                      {templates.map(t => (
                        <option key={t.name} value={t.name}>{t.name} ({t.language})</option>
                      ))}
                    </select>
                    {templates.length === 0 && (
                      <p className="text-xs text-gray-600 mt-1">Nenhum template aprovado encontrado na sua conta WhatsApp Business.</p>
                    )}
                  </div>
                )}

                {selectedTemplate && templateVars.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">Variáveis do template ({"{{1}}"}, {"{{2}}"}...)</p>
                    {templateVars.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={v}
                          onChange={e => setTemplateVars(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
                          placeholder={`Variável ${i + 1}`}
                          disabled={v === "{nome}"}
                          className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm disabled:text-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => setTemplateVars(prev => prev.map((x, idx) => idx === i ? (x === "{nome}" ? "" : "{nome}") : x))}
                          className={`flex items-center gap-1 text-xs px-2 py-2 rounded-lg border flex-shrink-0 ${
                            v === "{nome}" ? "border-blue-500 bg-blue-500/10 text-blue-300" : "border-gray-800 text-gray-500 hover:border-gray-600"
                          }`}
                          title="Usar o nome do contato"
                        >
                          <User size={12} /> Nome
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Modo */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setModo("NORMAL")}
                    className={`text-left p-3 rounded-xl border transition-colors ${modo === "NORMAL" ? "border-blue-500 bg-blue-500/10" : "border-gray-800 hover:border-gray-600"}`}
                  >
                    <p className="text-sm font-medium flex items-center gap-1.5"><MessageSquareText size={13} /> Disparo normal</p>
                    <p className="text-xs text-gray-500 mt-0.5">Mesma mensagem para todos (com {"{nome}"} personalizando)</p>
                  </button>
                  <button
                    onClick={() => setModo("IA_VARIACAO")}
                    className={`text-left p-3 rounded-xl border transition-colors ${modo === "IA_VARIACAO" ? "border-purple-500 bg-purple-500/10" : "border-gray-800 hover:border-gray-600"}`}
                  >
                    <p className="text-sm font-medium flex items-center gap-1.5"><Sparkles size={13} className="text-purple-400" /> Variação por IA</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cada envio é reescrito — reduz risco de bloqueio por spam</p>
                  </button>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Mensagem base</label>
                  <textarea
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder={"Oi {nome}! Temos uma condição especial essa semana pra você..."}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm resize-none"
                  />
                  <p className="text-xs text-gray-600 mt-0.5">{"{nome}"} vira o primeiro nome do contato.</p>
                </div>

                {modo === "IA_VARIACAO" && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Orientações para a IA (opcional)</label>
                    <input
                      value={instrucoesIA}
                      onChange={e => setInstrucoesIA(e.target.value)}
                      placeholder="Ex: manter tom informal; preservar o valor R$ 99 sem alterar"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                      maxLength={500}
                    />
                  </div>
                )}
              </>
            )}

            {/* Audiência */}
            <div className="border-t border-gray-800 pt-3 space-y-2">
              <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5"><Users size={12} /> Público (só contatos de WhatsApp)</p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFontePublico("filtros")}
                  className={`flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 border transition-colors ${
                    fontePublico === "filtros" ? "border-blue-500 bg-blue-500/10" : "border-gray-800 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <FilterIcon size={13} /> Filtros do CRM
                </button>
                <button
                  onClick={() => setFontePublico("importar")}
                  className={`flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 border transition-colors ${
                    fontePublico === "importar" ? "border-blue-500 bg-blue-500/10" : "border-gray-800 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <FileSpreadsheet size={13} /> Importar planilha
                </button>
              </div>

              {fontePublico === "filtros" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Já compraram?</label>
                    <select value={compradores} onChange={e => setCompradores(e.target.value as any)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm">
                      <option value="todos">Todos os contatos</option>
                      <option value="sim">Só quem já comprou</option>
                      <option value="nao">Só quem nunca comprou</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Última interação</label>
                    <select value={inatividade} onChange={e => setInatividade(e.target.value as any)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm">
                      <option value="qualquer">Qualquer período</option>
                      <option value="7d">Sem contato há 7+ dias</option>
                      <option value="30d">Sem contato há 30+ dias</option>
                      <option value="60d">Sem contato há 60+ dias</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1 flex items-center gap-1"><KanbanSquare size={10} /> Etapa do pipeline</label>
                    <select value={stageId} onChange={e => setStageId(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm">
                      <option value="">Qualquer etapa</option>
                      {pipelines.map(p => (
                        <optgroup key={p.id} label={p.name}>
                          {p.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1 flex items-center gap-1"><Star size={10} /> Nível da carteira</label>
                    <select value={nivel} onChange={e => setNivel(e.target.value as Nivel | "")} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm">
                      <option value="">Qualquer nível</option>
                      {(Object.keys(NIVEL_META) as Nivel[]).map(n => (
                        <option key={n} value={n}>{NIVEL_META[n].label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1 flex items-center gap-1"><UserSquare2 size={10} /> Carteira do vendedor</label>
                    <select value={atendenteId} onChange={e => setAtendenteId(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm">
                      <option value="">Todos os vendedores</option>
                      {atendentes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-sm font-medium bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-1.5"
                    >
                      <Upload size={13} /> Escolher arquivo (.csv)
                    </button>
                    <button
                      onClick={() => downloadCsvTemplate(CSV_TEMPLATE_CONTATOS, "modelo-contatos.csv")}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      Baixar modelo
                    </button>
                    <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleSelectPlanilha} className="hidden" />
                  </div>
                  {contatosImportados.length > 0 && (
                    <p className="text-xs text-green-400">{contatosImportados.length} contato{contatosImportados.length === 1 ? "" : "s"} pronto{contatosImportados.length === 1 ? "" : "s"} para a campanha.</p>
                  )}
                  {importError && <p className="text-xs text-amber-400">{importError}</p>}
                  <p className="text-[11px] text-gray-600">Colunas esperadas: <code className="text-gray-500">nome</code> e <code className="text-gray-500">telefone</code> (com DDD). Máximo 500 contatos.</p>
                </div>
              )}
            </div>

            {/* Ritmo */}
            <div className="border-t border-gray-800 pt-3 space-y-2">
              <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5"><ShieldCheck size={12} /> Ritmo de envio</p>
              <div className="space-y-1.5">
                {RITMOS.map(r => (
                  <label
                    key={r.key}
                    className={`flex items-start gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-colors ${
                      ritmo === r.key ? "border-blue-500 bg-blue-500/10" : "border-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <input type="radio" checked={ritmo === r.key} onChange={() => setRitmo(r.key)} className="mt-0.5 w-3.5 h-3.5" />
                    <div>
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-gray-500">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button onClick={handleCriar} disabled={criando} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium">
                {criando ? "Criando..." : "Criar e iniciar disparo"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2">Cancelar</button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-2">
          {loading && <p className="text-sm text-gray-500 text-center py-8">Carregando...</p>}
          {!loading && campanhas.length === 0 && (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center">
              <Megaphone size={36} className="mx-auto text-gray-600 mb-3" />
              <p className="font-medium text-gray-400">Nenhuma campanha ainda</p>
              <p className="text-sm text-gray-600 mt-1">Crie a primeira para disparar em massa com segurança.</p>
            </div>
          )}
          {campanhas.map(c => {
            const pct = c.total > 0 ? Math.round(((c.enviados + c.erros) / c.total) * 100) : 0;
            return (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {c.origemMensagem === "TEMPLATE_META" && <Globe2 size={12} className="text-blue-400 flex-shrink-0" />}
                      {c.modo === "IA_VARIACAO" && <Sparkles size={12} className="text-purple-400 flex-shrink-0" />}
                      {c.nome}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-md">{c.mensagem}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0 ${STATUS_LABEL[c.status].color}`}>
                    {STATUS_LABEL[c.status].label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">{c.enviados}/{c.total}{c.erros > 0 ? ` (${c.erros} erro${c.erros === 1 ? "" : "s"})` : ""}</span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-600 flex items-center gap-1"><Clock size={10} /> {new Date(c.createdAt).toLocaleString("pt-BR")}</p>
                  <div className="flex gap-2">
                    {c.status === "ENVIANDO" && (
                      <button onClick={() => handleStatus(c, "PAUSADA")} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"><Pause size={11} /> Pausar</button>
                    )}
                    {c.status === "PAUSADA" && (
                      <button onClick={() => handleStatus(c, "ENVIANDO")} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"><Play size={11} /> Retomar</button>
                    )}
                    {(c.status === "ENVIANDO" || c.status === "PAUSADA") && (
                      <button onClick={() => handleStatus(c, "CANCELADA")} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><Ban size={11} /> Cancelar</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-600">
          O disparo respeita o intervalo escolhido entre cada mensagem (aleatório, dentro da faixa) para reduzir o
          risco de bloqueio do número. A variação por IA reescreve o texto para cada destinatário, mantendo o
          significado — use com moderação e sempre com contatos que já interagiram com a empresa.
        </p>
      </div>
    </div>
  );
}
