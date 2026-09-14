"use client";

import { useState } from "react";
import { ClipboardCheck, Sparkles, X, MessageCircle, Send, Trophy, DoorClosed, TrendingUp, TrendingDown, Timer, Layers } from "lucide-react";

type Atendente = { id: string; name: string };

type StatsAtendimento = {
  conversas: number;
  mensagensEnviadas: number;
  encerradas: number;
  vendasGanhas: number;
  valorGanho: number;
  motivos: { motivo: string; qtd: number }[];
};

type StatsComercial = {
  porEtapa: { pipeline: string; etapa: string; quantidade: number; diasParadoMedio: number; diasParadoMax: number }[];
  entradas: number;
  ganhas: number; valorGanho: number;
  perdidas: number; valorPerdido: number;
  cicloMedioDias: number | null;
  taxaConversao: number | null;
  maisTravadas: { nome: string; etapa: string; diasParado: number; valor: number }[];
};

type Tipo = "atendimento" | "comercial";
type Periodo = "7d" | "15d" | "30d" | "mes_atual" | "mes_anterior" | "custom";

const TIPOS: { key: Tipo; label: string; desc: string }[] = [
  { key: "atendimento", label: "Qualidade do atendimento", desc: "Analisa trechos reais de conversas: tom, agilidade, condução comercial." },
  { key: "comercial", label: "Processo comercial (funil)", desc: "Analisa o pipeline: onde as negociações travam, conversão e ciclo de venda." },
];

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "15d", label: "15 dias" },
  { key: "30d", label: "30 dias" },
  { key: "mes_atual", label: "Mês atual" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "custom", label: "Personalizado" },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function rangeFor(p: Periodo, customStart: string, customEnd: string): { inicio: Date; fim: Date } {
  const now = new Date();
  if (p === "mes_atual") return { inicio: new Date(now.getFullYear(), now.getMonth(), 1), fim: now };
  if (p === "mes_anterior") {
    return {
      inicio: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      fim: new Date(now.getFullYear(), now.getMonth(), 1),
    };
  }
  if (p === "custom") {
    return {
      inicio: customStart ? new Date(`${customStart}T00:00:00`) : new Date(now.getTime() - 7 * 86400000),
      fim: customEnd ? new Date(`${customEnd}T23:59:59`) : now,
    };
  }
  const days = { "7d": 7, "15d": 15, "30d": 30 }[p] ?? 30;
  return { inicio: new Date(now.getTime() - days * 86400000), fim: now };
}

export function AuditoriaClient({ agentId, atendentes }: { agentId: string; atendentes: Atendente[] }) {
  const [tipo, setTipo] = useState<Tipo>("atendimento");
  const [atendenteId, setAtendenteId] = useState<string>("");
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [foco, setFoco] = useState("");

  const [gerando, setGerando] = useState(false);
  const [relatorio, setRelatorio] = useState("");
  const [tipoRelatorio, setTipoRelatorio] = useState<Tipo>("atendimento");
  const [statsAtendimento, setStatsAtendimento] = useState<StatsAtendimento | null>(null);
  const [statsComercial, setStatsComercial] = useState<StatsComercial | null>(null);
  const [error, setError] = useState("");

  function trocarTipo(novo: Tipo) {
    setTipo(novo);
    setError("");
  }

  async function handleGerar() {
    setGerando(true);
    setError("");
    setRelatorio("");
    setStatsAtendimento(null);
    setStatsComercial(null);
    try {
      const { inicio, fim } = rangeFor(periodo, customStart, customEnd);
      const res = await fetch(`/api/agentes/${agentId}/auditoria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          atendenteId: atendenteId || null,
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          foco: foco.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar auditoria.");
      setRelatorio(data.relatorio);
      setTipoRelatorio(tipo);
      if (tipo === "comercial") setStatsComercial(data.stats);
      else setStatsAtendimento(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar auditoria.");
    } finally {
      setGerando(false);
    }
  }

  const atendenteNome = atendenteId ? (atendentes.find(a => a.id === atendenteId)?.name ?? "") : "Todos";

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <p className="text-gray-400 text-sm">Gestão</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
            <ClipboardCheck size={26} className="text-blue-400" /> Auditoria
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {tipo === "comercial"
              ? "A IA analisa o funil de vendas (pipeline) e devolve gargalos, negociações travadas e recomendações pra destravar o processo."
              : "A IA analisa as conversas reais do período e devolve notas, pontos fortes, melhorias e conversas que merecem sua atenção."}
          </p>
        </div>

        {/* Tipo de auditoria */}
        <div className="flex gap-2">
          {TIPOS.map(t => (
            <button
              key={t.key}
              onClick={() => trocarTipo(t.key)}
              title={t.desc}
              className={`flex-1 text-left rounded-2xl border px-4 py-3 transition-colors ${
                tipo === t.key ? "bg-purple-900/30 border-purple-700" : "bg-gray-900 border-gray-800 hover:border-gray-700"
              }`}
            >
              <p className={`text-sm font-semibold ${tipo === t.key ? "text-purple-300" : "text-gray-300"}`}>{t.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Vendedor / atendente</label>
              <select
                value={atendenteId}
                onChange={e => setAtendenteId(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Todos (visão geral)</option>
                {atendentes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Período</label>
              <div className="flex gap-1.5 flex-wrap">
                {PERIODOS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPeriodo(p.key)}
                    className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                      periodo === p.key ? "bg-blue-600 border-blue-600 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {periodo === "custom" && (
            <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
              De
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm text-white" />
              até
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm text-white" />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1">O que você quer que a IA analise? (opcional)</label>
            <textarea
              value={foco}
              onChange={e => setFoco(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={
                tipo === "comercial"
                  ? 'Ex: "foca na etapa de Negociação" ou "quero saber se o valor médio das travadas justifica priorizar elas"'
                  : 'Ex: "veja se os vendedores estão pedindo o fechamento" ou "confira se a IA está seguindo o script certo"'
              }
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-gray-600"
            />
          </div>

          <button
            onClick={handleGerar}
            disabled={gerando}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-60 rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            <Sparkles size={15} />
            {gerando ? "Analisando..." : "Gerar auditoria"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm rounded-xl px-4 py-3 flex items-start justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError("")} className="flex-shrink-0 text-red-400 hover:text-red-200"><X size={14} /></button>
          </div>
        )}

        {/* Estatísticas — qualidade do atendimento */}
        {statsAtendimento && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Conversas ativas", value: String(statsAtendimento.conversas), icon: MessageCircle },
                { label: "Mensagens enviadas", value: String(statsAtendimento.mensagensEnviadas), icon: Send },
                { label: "Vendas ganhas", value: `${statsAtendimento.vendasGanhas}${statsAtendimento.valorGanho > 0 ? ` · ${brl(statsAtendimento.valorGanho)}` : ""}`, icon: Trophy },
                { label: "Encerradas", value: String(statsAtendimento.encerradas), icon: DoorClosed },
              ].map(card => (
                <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <card.icon size={15} className="text-blue-400 mb-1.5" />
                  <p className="text-lg font-bold truncate">{card.value}</p>
                  <p className="text-[10px] text-gray-500">{card.label}</p>
                </div>
              ))}
            </div>

            {statsAtendimento.motivos.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {statsAtendimento.motivos.map(m => (
                  <span key={m.motivo} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-900 border border-gray-800 text-gray-400">
                    {m.motivo}: <span className="font-bold text-gray-200">{m.qtd}</span>
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Estatísticas — processo comercial (funil) */}
        {statsComercial && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Negociações novas", value: String(statsComercial.entradas), icon: Layers },
                { label: "Ganhas", value: `${statsComercial.ganhas}${statsComercial.valorGanho > 0 ? ` · ${brl(statsComercial.valorGanho)}` : ""}`, icon: TrendingUp },
                { label: "Perdidas", value: `${statsComercial.perdidas}${statsComercial.valorPerdido > 0 ? ` · ${brl(statsComercial.valorPerdido)}` : ""}`, icon: TrendingDown },
                { label: "Ciclo médio até ganhar", value: statsComercial.cicloMedioDias !== null ? `${statsComercial.cicloMedioDias}d` : "—", icon: Timer },
              ].map(card => (
                <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <card.icon size={15} className="text-blue-400 mb-1.5" />
                  <p className="text-lg font-bold truncate">{card.value}</p>
                  <p className="text-[10px] text-gray-500">{card.label}</p>
                </div>
              ))}
            </div>

            {statsComercial.taxaConversao !== null && (
              <p className="text-xs text-gray-400">Taxa de conversão do período: <span className="font-bold text-gray-200">{statsComercial.taxaConversao}%</span> (ganhas / ganhas+perdidas)</p>
            )}

            {statsComercial.porEtapa.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400">Negociações abertas agora, por etapa</p>
                {statsComercial.porEtapa.map(e => (
                  <div key={`${e.pipeline}-${e.etapa}`} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-gray-300 truncate">{e.pipeline} → {e.etapa}</span>
                    <span className="text-gray-500 flex-shrink-0">{e.quantidade} parada(s) · média {e.diasParadoMedio}d · pior {e.diasParadoMax}d</span>
                  </div>
                ))}
              </div>
            )}

            {statsComercial.maisTravadas.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400">Negociações mais travadas</p>
                {statsComercial.maisTravadas.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-gray-300 truncate">{t.nome} — {t.etapa}</span>
                    <span className="text-gray-500 flex-shrink-0">{t.diasParado}d parada · {brl(t.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Relatório */}
        {relatorio && (
          <div className="bg-purple-950/30 border border-purple-800/40 rounded-2xl p-5">
            <p className="text-sm font-semibold text-purple-300 flex items-center gap-1.5 mb-3">
              <ClipboardCheck size={14} /> {tipoRelatorio === "comercial" ? "Auditoria do funil" : "Auditoria"} — {atendenteNome}
            </p>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{relatorio}</p>
          </div>
        )}

        <p className="text-xs text-gray-600">
          {tipo === "comercial"
            ? "A auditoria do funil usa o estado atual de todas as negociações abertas (etapa e tempo parado) e o resultado consolidado do período (ganhas/perdidas/ciclo). Sem histórico de etapas passadas, a conversão é medida pelo resultado final, não etapa a etapa."
            : "A auditoria usa uma amostra das conversas mais recentes do período (até 10, com até 40 mensagens cada) e as estatísticas completas."}
          {" "}Só o gestor tem acesso a esta página.
        </p>
      </div>
    </div>
  );
}
