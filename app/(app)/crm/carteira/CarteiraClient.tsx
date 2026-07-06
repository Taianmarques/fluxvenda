"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Search, X, Instagram, MessageCircle, Bot, Sparkles } from "lucide-react";

export type CarteiraCliente = {
  contactNumber: string;
  contactName: string | null;
  conversationId: string;
  nivelManual: string | null; // override manual ("A".."PERDIDO") — null = automático
  lastContactAt: string; // ISO
  assignedToName: string | null;
  leadStatusName: string | null;
  leadStatusColor: string | null;
  conversaStatus: string; // ATIVO | AGUARDANDO | FINALIZADO
  lastMessageRole: string | null; // user | assistant | human
  compras: { at: string; valor: number }[]; // pedidos pagos + cobranças pagas + oportunidades ganhas
  orcamentosAbertos: number;
  orcamentoAbertoValor: number;
};

export type CarteiraConfig = {
  carteiraEnabled: boolean;
  posVendaEnabled: boolean;
  posVendaDelayHours: number;
  posVendaMensagem: string;
  recompraEnabled: boolean;
  recompraDias: number;
  carteiraInstrucoes: string;
  carteiraInativoDias: number;
  posVendaPesquisaEnabled: boolean;
  posVendaReviewLink: string;
};

export type Nivel = "A" | "B" | "C" | "INATIVO" | "PERDIDO" | "PROSPECTO";

export const NIVEL_META: Record<Nivel, { label: string; badge: string; desc: string }> = {
  A: { label: "A", badge: "bg-emerald-900/50 text-emerald-300 border-emerald-700", desc: "Alto potencial: recorrente + ticket alto. Prioridade máxima" },
  B: { label: "B", badge: "bg-blue-900/50 text-blue-300 border-blue-700", desc: "Compra média com boa frequência. Pode crescer com ofertas" },
  C: { label: "C", badge: "bg-gray-800 text-gray-300 border-gray-600", desc: "Baixa frequência ou ticket. Precisa ser ativado/educado" },
  INATIVO: { label: "Inativo", badge: "bg-amber-900/50 text-amber-300 border-amber-700", desc: "Sem compra há mais tempo que o limite configurado" },
  PERDIDO: { label: "Perdido", badge: "bg-red-900/50 text-red-300 border-red-700", desc: "Sem compra há +180 dias ou foi para outro fornecedor" },
  PROSPECTO: { label: "Nunca comprou", badge: "bg-violet-900/50 text-violet-300 border-violet-700", desc: "Está na carteira mas ainda não converteu" },
};

type Periodo = "hoje" | "7d" | "15d" | "30d" | "60d" | "90d" | "mes_atual" | "mes_anterior" | "custom";
type Segmento = "todos" | "compraram" | "nao_compraram" | "reduziram" | "aumentaram" | "orcamento" | "sem_contato" | "followup";
type Ordem = "recentes" | "valor" | "valor_periodo" | "prioridade";

const NIVEL_ORDEM: Record<Nivel, number> = { A: 0, B: 1, C: 2, INATIVO: 3, PROSPECTO: 4, PERDIDO: 5 };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const isIg = (n: string) => n.startsWith("ig_");

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}m atrás` : `${Math.floor(months / 12)}a atrás`;
}

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "15d", label: "15 dias" },
  { key: "30d", label: "30 dias" },
  { key: "60d", label: "60 dias" },
  { key: "90d", label: "90 dias" },
  { key: "mes_atual", label: "Mês atual" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "custom", label: "Personalizado" },
];

function rangeFor(p: Periodo, customStart: string, customEnd: string): { start: Date; end: Date } {
  const now = new Date();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  if (p === "hoje") return { start: startOfDay(now), end: now };
  if (p === "mes_atual") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  if (p === "mes_anterior") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 1),
    };
  }
  if (p === "custom") {
    const s = customStart ? startOfDay(new Date(`${customStart}T00:00:00`)) : startOfDay(now);
    const e = customEnd ? new Date(`${customEnd}T23:59:59`) : now;
    return { start: s, end: e };
  }
  const days = { "7d": 7, "15d": 15, "30d": 30, "60d": 60, "90d": 90 }[p] ?? 30;
  return { start: new Date(now.getTime() - days * 86400000), end: now };
}

function sumCompras(c: CarteiraCliente, start: Date, end: Date): number {
  let s = 0;
  for (const compra of c.compras) {
    const at = new Date(compra.at);
    if (at >= start && at <= end) s += compra.valor;
  }
  return s;
}

export function CarteiraClient({ agentId, clientes, initialConfig, isManager, inativoDias }: {
  agentId: string;
  clientes: CarteiraCliente[];
  initialConfig?: CarteiraConfig;
  isManager?: boolean;
  inativoDias?: number;
}) {
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [segmento, setSegmento] = useState<Segmento>("todos");
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [nivelFiltro, setNivelFiltro] = useState<Nivel | "todos">("todos");
  const [niveisManuais, setNiveisManuais] = useState<Record<string, string | null>>({});

  // Configuração do agente de carteira
  const [showConfig, setShowConfig] = useState(false);
  const [cfg, setCfg] = useState<CarteiraConfig>(initialConfig ?? {
    carteiraEnabled: false, posVendaEnabled: true, posVendaDelayHours: 24,
    posVendaMensagem: "", recompraEnabled: true, recompraDias: 30, carteiraInstrucoes: "",
    carteiraInativoDias: 60, posVendaPesquisaEnabled: true, posVendaReviewLink: "",
  });
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfgSaved, setCfgSaved] = useState(false);

  // Análise da IA
  const [analise, setAnalise] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [analiseError, setAnaliseError] = useState("");

  const { start, end } = useMemo(
    () => rangeFor(periodo, customStart, customEnd),
    [periodo, customStart, customEnd]
  );
  // Período anterior equivalente (para reduziu/aumentou)
  const prev = useMemo(() => {
    const len = end.getTime() - start.getTime();
    return { start: new Date(start.getTime() - len), end: start };
  }, [start, end]);

  type ClienteCalc = CarteiraCliente & {
    valorPeriodo: number;
    valorPeriodoAnterior: number;
    totalComprado: number;
    pedidos: number;
    lastPurchaseAt: string | null;
    valor180: number;
    freq180: number;
    nivel: Nivel;
  };

  const limiteInativo = cfg.carteiraInativoDias || inativoDias || 60;

  const calc: ClienteCalc[] = useMemo(() => {
    const now = new Date();
    const d180 = new Date(now.getTime() - 180 * 86400000);

    const base = clientes.map(c => {
      const totalComprado = c.compras.reduce((s, x) => s + x.valor, 0);
      const lastPurchaseAt = c.compras.length > 0
        ? c.compras.reduce((max, x) => (x.at > max ? x.at : max), c.compras[0].at)
        : null;
      const compras180 = c.compras.filter(x => new Date(x.at) >= d180);
      return {
        ...c,
        valorPeriodo: sumCompras(c, start, end),
        valorPeriodoAnterior: sumCompras(c, prev.start, prev.end),
        totalComprado,
        pedidos: c.compras.length,
        lastPurchaseAt,
        valor180: compras180.reduce((s, x) => s + x.valor, 0),
        freq180: compras180.length,
        nivel: "C" as Nivel, // preenchido abaixo
      };
    });

    // Percentis de valor (180d) entre os compradores ativos — a régua se adapta à carteira
    const ativos = base.filter(c => {
      if (!c.lastPurchaseAt) return false;
      const dias = (now.getTime() - new Date(c.lastPurchaseAt).getTime()) / 86400000;
      return dias <= limiteInativo;
    });
    const valores = ativos.map(c => c.valor180).sort((a, b) => a - b);
    const pct = (p: number) => valores.length > 0 ? valores[Math.min(valores.length - 1, Math.floor(valores.length * p))] : 0;
    const p75 = pct(0.75);
    const mediana = pct(0.5);

    for (const c of base) {
      const manual = niveisManuais[c.conversationId] !== undefined ? niveisManuais[c.conversationId] : c.nivelManual;
      if (manual) { c.nivel = manual as Nivel; continue; }
      if (!c.lastPurchaseAt) { c.nivel = "PROSPECTO"; continue; }
      const dias = (now.getTime() - new Date(c.lastPurchaseAt).getTime()) / 86400000;
      if (dias > 180) { c.nivel = "PERDIDO"; continue; }
      if (dias > limiteInativo) { c.nivel = "INATIVO"; continue; }
      // Ativo: A = recorrente (3+) e ticket alto (top 25%); B = 2+ compras ou acima da mediana; C = resto
      if (c.freq180 >= 3 && c.valor180 >= p75 && p75 > 0) c.nivel = "A";
      else if (c.freq180 >= 2 || (c.valor180 >= mediana && mediana > 0)) c.nivel = "B";
      else c.nivel = "C";
    }
    return base;
  }, [clientes, start, end, prev, limiteInativo, niveisManuais]);

  async function handleSetNivel(conversationId: string, nivel: string) {
    const value = nivel === "" ? null : nivel;
    setNiveisManuais(prevMap => ({ ...prevMap, [conversationId]: value }));
    await fetch(`/api/agentes/${agentId}/carteira/nivel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, nivel: value }),
    }).catch(() => {});
  }

  function inSegment(c: ClienteCalc, seg: Segmento): boolean {
    switch (seg) {
      case "todos": return true;
      case "compraram": return c.valorPeriodo > 0;
      case "nao_compraram": return c.valorPeriodo === 0;
      case "reduziram": return c.valorPeriodoAnterior > 0 && c.valorPeriodo < c.valorPeriodoAnterior;
      case "aumentaram": return c.valorPeriodo > c.valorPeriodoAnterior && c.valorPeriodo > 0;
      case "orcamento": return c.orcamentosAbertos > 0;
      case "sem_contato": return new Date(c.lastContactAt) < start;
      case "followup": return c.conversaStatus !== "FINALIZADO" && (c.lastMessageRole === "assistant" || c.lastMessageRole === "human");
    }
  }

  const segCounts = useMemo(() => {
    const counts: Record<Segmento, number> = {
      todos: calc.length, compraram: 0, nao_compraram: 0, reduziram: 0,
      aumentaram: 0, orcamento: 0, sem_contato: 0, followup: 0,
    };
    for (const c of calc) {
      (["compraram", "nao_compraram", "reduziram", "aumentaram", "orcamento", "sem_contato", "followup"] as Segmento[])
        .forEach(s => { if (inSegment(c, s)) counts[s]++; });
    }
    return counts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc]);

  const receitaPeriodo = useMemo(() => calc.reduce((s, c) => s + c.valorPeriodo, 0), [calc]);

  const nivelCounts = useMemo(() => {
    const counts: Record<Nivel, number> = { A: 0, B: 0, C: 0, INATIVO: 0, PERDIDO: 0, PROSPECTO: 0 };
    for (const c of calc) counts[c.nivel]++;
    return counts;
  }, [calc]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = calc.filter(c => inSegment(c, segmento));
    if (nivelFiltro !== "todos") base = base.filter(c => c.nivel === nivelFiltro);
    if (q) base = base.filter(c => (c.contactName ?? "").toLowerCase().includes(q) || c.contactNumber.includes(q));
    return [...base].sort((a, b) => {
      if (ordem === "valor") return b.totalComprado - a.totalComprado;
      if (ordem === "valor_periodo") return b.valorPeriodo - a.valorPeriodo;
      if (ordem === "prioridade") {
        const diff = NIVEL_ORDEM[a.nivel] - NIVEL_ORDEM[b.nivel];
        return diff !== 0 ? diff : b.totalComprado - a.totalComprado;
      }
      return b.lastContactAt.localeCompare(a.lastContactAt);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc, search, segmento, ordem, nivelFiltro]);

  async function handleSaveConfig() {
    setSavingCfg(true);
    setCfgSaved(false);
    try {
      const res = await fetch(`/api/agentes/${agentId}/carteira`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (res.ok) { setCfgSaved(true); setTimeout(() => setCfgSaved(false), 2500); }
    } finally { setSavingCfg(false); }
  }

  async function handleAnalisar() {
    setAnalisando(true);
    setAnaliseError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/carteira/analise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodoLabel: PERIODOS.find(p => p.key === periodo)?.label ?? periodo,
          inicio: start.toISOString(),
          fim: end.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro na análise.");
      setAnalise(data.analise);
    } catch (e: any) {
      setAnaliseError(e.message ?? "Erro na análise.");
    } finally { setAnalisando(false); }
  }

  const SEGMENTOS: { key: Segmento; label: string; hint: string }[] = [
    { key: "compraram", label: "Compraram", hint: "no período" },
    { key: "nao_compraram", label: "Não compraram", hint: "no período" },
    { key: "reduziram", label: "Reduziram compra", hint: "vs período anterior" },
    { key: "aumentaram", label: "Aumentaram compra", hint: "vs período anterior" },
    { key: "orcamento", label: "Orçamento em aberto", hint: "pedido sem pagamento" },
    { key: "sem_contato", label: "Sem contato recente", hint: "nenhuma interação no período" },
    { key: "followup", label: "Follow-up pendente", hint: "empresa falou por último" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-gray-400 text-sm">Atendimento</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <Briefcase size={26} className="text-blue-400" /> Carteira de clientes
            </h1>
          </div>
          {isManager && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleAnalisar}
                disabled={analisando}
                className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-60 rounded-xl px-4 py-2.5 text-sm font-medium"
              >
                <Sparkles size={15} />
                {analisando ? "Analisando..." : "Análise da IA"}
              </button>
              <button
                onClick={() => setShowConfig(s => !s)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  cfg.posVendaEnabled || cfg.recompraEnabled ? "bg-green-700 hover:bg-green-600" : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                <Bot size={15} />
                {cfg.posVendaEnabled || cfg.recompraEnabled ? "Agentes ativos" : "Configurar agentes"}
              </button>
            </div>
          )}
        </div>

        {/* Análise da IA */}
        {(analise || analiseError) && (
          <div className="bg-purple-950/30 border border-purple-800/40 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-purple-300 flex items-center gap-1.5"><Sparkles size={14} /> Análise da carteira</p>
              <button onClick={() => { setAnalise(""); setAnaliseError(""); }} className="text-gray-500 hover:text-white"><X size={15} /></button>
            </div>
            {analiseError
              ? <p className="text-sm text-red-400">{analiseError}</p>
              : <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{analise}</p>}
          </div>
        )}

        {/* Configuração do agente */}
        {showConfig && isManager && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
            <div>
              <p className="font-semibold">Agentes da carteira</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Dois agentes independentes que trabalham a carteira sozinhos pelo WhatsApp — também podem ser ligados/desligados pelo Hub de agentes.
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cfg.posVendaEnabled} onChange={e => setCfg(c => ({ ...c, posVendaEnabled: e.target.checked }))} className="w-4 h-4" />
                <div>
                  <span className="text-sm font-medium">Agente de Pós-venda</span>
                  <p className="text-xs text-gray-500">Agradece após a compra, faz pesquisa de satisfação, escala notas baixas para a equipe e pede avaliação pública nas notas altas. Funciona mesmo com o agente de carteira desligado.</p>
                </div>
              </label>
              {cfg.posVendaEnabled && (
                <div className="space-y-3 pl-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                    Enviar
                    <input
                      type="number" min={1} max={168} value={cfg.posVendaDelayHours}
                      onChange={e => setCfg(c => ({ ...c, posVendaDelayHours: Math.min(168, Math.max(1, Number(e.target.value))) }))}
                      className="w-20 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm text-white"
                    />
                    horas depois do pagamento confirmado
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Mensagem fixa (opcional — vazio = a IA escreve personalizada citando o pedido)</label>
                    <textarea
                      value={cfg.posVendaMensagem}
                      onChange={e => setCfg(c => ({ ...c, posVendaMensagem: e.target.value }))}
                      rows={2}
                      placeholder={"Ex: Oi {nome}! Passando pra agradecer sua compra. Chegou tudo certinho? Qualquer coisa é só chamar!"}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm resize-none"
                      maxLength={1000}
                    />
                    <p className="text-xs text-gray-600 mt-0.5">{"{nome}"} vira o primeiro nome do cliente.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={cfg.posVendaPesquisaEnabled} onChange={e => setCfg(c => ({ ...c, posVendaPesquisaEnabled: e.target.checked }))} className="w-4 h-4" />
                    <div>
                      <span className="text-sm">Pesquisa de satisfação (nota de 0 a 5)</span>
                      <p className="text-xs text-gray-600">Nota ≤ 3 gera alerta interno na conversa para contato humano; nota ≥ 4 dispara o pedido de avaliação pública.</p>
                    </div>
                  </label>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Link de avaliação pública (opcional — ex: Google)</label>
                    <input
                      value={cfg.posVendaReviewLink}
                      onChange={e => setCfg(c => ({ ...c, posVendaReviewLink: e.target.value }))}
                      placeholder="https://g.page/r/..."
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                      maxLength={300}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cfg.recompraEnabled} onChange={e => setCfg(c => ({ ...c, recompraEnabled: e.target.checked }))} className="w-4 h-4" />
                <div>
                  <span className="text-sm font-medium">Agente de Recompra</span>
                  <p className="text-xs text-gray-500">Reativa quem parou de comprar com uma mensagem pessoal citando a última compra.</p>
                </div>
              </label>
              {cfg.recompraEnabled && (
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                    Contatar quem não compra há
                    <input
                      type="number" min={3} max={180} value={cfg.recompraDias}
                      onChange={e => setCfg(c => ({ ...c, recompraDias: Math.min(180, Math.max(3, Number(e.target.value))) }))}
                      className="w-20 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm text-white"
                    />
                    dias
                  </div>
                  <p className="text-xs text-gray-600">
                    A IA escreve uma mensagem pessoal citando a última compra. Um toque por ciclo: o cliente só recebe de novo se voltar a comprar. Não interrompe conversas ativas nem atendimentos manuais.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                Considerar cliente <span className="text-amber-400 font-medium">Inativo</span> após
                <select
                  value={cfg.carteiraInativoDias}
                  onChange={e => setCfg(c => ({ ...c, carteiraInativoDias: Number(e.target.value) }))}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm text-white"
                >
                  {[15, 30, 60, 90, 120].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                dias sem compra
              </div>
              <p className="text-xs text-gray-600">Acima de 180 dias sem compra o cliente vira Perdido automaticamente.</p>
            </div>

            <div className="border-t border-gray-800 pt-4">
              <label className="text-xs text-gray-400 block mb-1">Orientações para a IA (opcional)</label>
              <textarea
                value={cfg.carteiraInstrucoes}
                onChange={e => setCfg(c => ({ ...c, carteiraInstrucoes: e.target.value }))}
                rows={2}
                placeholder="Ex: ofereça 10% de desconto na segunda compra com o cupom VOLTA10; nunca mencione concorrentes..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm resize-none"
                maxLength={1000}
              />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSaveConfig} disabled={savingCfg} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
                {savingCfg ? "Salvando..." : "Salvar"}
              </button>
              {cfgSaved && <span className="text-xs text-green-400">Salvo!</span>}
            </div>
          </div>
        )}

        {/* Período */}
        <div className="space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {PERIODOS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriodo(p.key)}
                className={`flex-shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                  periodo === p.key ? "bg-blue-600 border-blue-600 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {periodo === "custom" && (
            <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
              De
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-sm text-white" />
              até
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-sm text-white" />
            </div>
          )}
          <p className="text-xs text-gray-600">
            {calc.length} cliente{calc.length === 1 ? "" : "s"} na carteira · receita no período: <span className="text-green-400 font-medium">{brl(receitaPeriodo)}</span>
          </p>
        </div>

        {/* Segmentos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={() => setSegmento("todos")}
            className={`text-left rounded-xl border p-3 transition-colors ${segmento === "todos" ? "border-blue-500 bg-blue-500/10" : "border-gray-800 bg-gray-900 hover:border-gray-600"}`}
          >
            <p className="text-lg font-bold">{segCounts.todos}</p>
            <p className="text-xs text-gray-400">Todos os clientes</p>
          </button>
          {SEGMENTOS.map(s => (
            <button
              key={s.key}
              onClick={() => setSegmento(segmento === s.key ? "todos" : s.key)}
              className={`text-left rounded-xl border p-3 transition-colors ${segmento === s.key ? "border-blue-500 bg-blue-500/10" : "border-gray-800 bg-gray-900 hover:border-gray-600"}`}
            >
              <p className="text-lg font-bold">{segCounts[s.key]}</p>
              <p className="text-xs text-gray-300">{s.label}</p>
              <p className="text-[10px] text-gray-600">{s.hint}</p>
            </button>
          ))}
        </div>

        {/* Nível da carteira */}
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500 font-medium">Nível da carteira <span className="text-gray-600 font-normal">(classificação automática por recorrência, ticket e recência — ajustável por cliente)</span></p>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setNivelFiltro("todos")}
              className={`flex-shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                nivelFiltro === "todos" ? "bg-blue-600 border-blue-600 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"
              }`}
            >
              Todos
            </button>
            {(Object.keys(NIVEL_META) as Nivel[]).map(n => (
              <button
                key={n}
                onClick={() => setNivelFiltro(nivelFiltro === n ? "todos" : n)}
                title={NIVEL_META[n].desc}
                className={`flex-shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                  nivelFiltro === n ? NIVEL_META[n].badge : "border-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                {NIVEL_META[n].label} <span className="opacity-70">{nivelCounts[n]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Busca + ordenação */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
            <Search size={14} className="text-gray-500 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou número..."
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-600"
            />
            {search && <button onClick={() => setSearch("")} className="text-gray-500 hover:text-white"><X size={14} /></button>}
          </div>
          <select
            value={ordem}
            onChange={e => setOrdem(e.target.value as Ordem)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm"
          >
            <option value="prioridade">Prioridade (nível)</option>
            <option value="recentes">Último contato</option>
            <option value="valor_periodo">Maior valor no período</option>
            <option value="valor">Maior valor total</option>
          </select>
        </div>

        {/* Lista */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 p-6 text-center">
              {clientes.length === 0 ? "Nenhum cliente ainda — a carteira se preenche conforme as conversas chegam." : "Nenhum cliente nesse segmento/busca."}
            </p>
          ) : (
            <div className="divide-y divide-gray-800">
              {filtered.map(c => (
                <Link
                  key={c.contactNumber}
                  href={`/crm/${agentId}?c=${c.conversationId}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isIg(c.contactNumber) ? "bg-pink-900/40 text-pink-400" : "bg-green-900/40 text-green-400"}`}>
                    {isIg(c.contactNumber) ? <Instagram size={15} /> : <MessageCircle size={15} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{c.contactName || c.contactNumber.replace("ig_", "ID ")}</p>
                      <select
                        value={(niveisManuais[c.conversationId] !== undefined ? niveisManuais[c.conversationId] : c.nivelManual) ?? ""}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                        onChange={e => { e.preventDefault(); e.stopPropagation(); handleSetNivel(c.conversationId, e.target.value); }}
                        title={NIVEL_META[c.nivel].desc + ((niveisManuais[c.conversationId] ?? c.nivelManual) ? " (definido manualmente)" : " (automático)")}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border cursor-pointer appearance-none text-center ${NIVEL_META[c.nivel].badge}`}
                      >
                        <option value="">{(niveisManuais[c.conversationId] ?? c.nivelManual) ? "Automático" : `${NIVEL_META[c.nivel].label} (auto)`}</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="INATIVO">Inativo</option>
                        <option value="PERDIDO">Perdido</option>
                      </select>
                      {c.leadStatusName && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0"
                          style={{ color: c.leadStatusColor ?? undefined, borderColor: `${c.leadStatusColor}66` }}
                        >
                          {c.leadStatusName}
                        </span>
                      )}
                      {c.orcamentosAbertos > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-700 text-amber-400 flex-shrink-0">
                          orçamento {brl(c.orcamentoAbertoValor)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      contato {timeAgo(c.lastContactAt)}
                      {c.lastPurchaseAt && ` · última compra ${timeAgo(c.lastPurchaseAt)}`}
                      {c.assignedToName && ` · ${c.assignedToName}`}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${c.valorPeriodo > 0 ? "text-green-400" : "text-gray-600"}`}>
                      {c.valorPeriodo > 0 ? brl(c.valorPeriodo) : "—"}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      total {c.totalComprado > 0 ? brl(c.totalComprado) : "—"} · {c.pedidos} compra{c.pedidos === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
