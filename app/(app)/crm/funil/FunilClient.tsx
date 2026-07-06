"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Inbox, Megaphone, Trophy, Users, Star, RefreshCw, Heart } from "lucide-react";

export type FunilPipeline = {
  id: string;
  name: string;
  stages: { id: string; name: string; color: string }[];
};

export type FunilLead = {
  conversationId: string;
  contactNumber: string;
  origem: "inbound" | "outbound";
  createdAt: string;
};

type FunilOpp = {
  id: string;
  conversationId: string;
  stageId: string | null;
  dealValue: number;
  wonAt: string | null;
};

type Compra = { contactNumber: string; valor: number };
type Feedback = { contactNumber: string; rating: number };
type Origem = "todos" | "inbound" | "outbound";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Barra({ count, max, color, label, sub, icon: Icon, minPct = 10 }: {
  count: number; max: number; color: string; label: string; sub?: string;
  icon?: typeof Trophy; minPct?: number;
}) {
  const largura = Math.max(minPct, (count / Math.max(1, max)) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 md:w-44 flex-shrink-0 text-right">
        <p className="text-xs font-medium truncate flex items-center justify-end gap-1">
          {Icon && <Icon size={10} style={{ color }} />}{label}
        </p>
        {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
      </div>
      <div className="flex-1 flex justify-center">
        <div
          className="h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ width: `${largura}%`, backgroundColor: `${color}45`, border: `1px solid ${color}90` }}
        >
          <span className="text-xs font-bold">{count}</span>
        </div>
      </div>
    </div>
  );
}

export function FunilClient({ pipelines, leads, opportunities, compras, feedbacks, agentId }: {
  pipelines: FunilPipeline[];
  leads: FunilLead[];
  opportunities: FunilOpp[];
  compras: Compra[];
  feedbacks: Feedback[];
  agentId: string;
}) {
  const [origem, setOrigem] = useState<Origem>("todos");
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");

  const pipeline = pipelines.find(p => p.id === pipelineId) ?? pipelines[0] ?? null;

  const dados = useMemo(() => {
    const leadsFiltrados = origem === "todos" ? leads : leads.filter(l => l.origem === origem);
    const conversationIds = new Set(leadsFiltrados.map(l => l.conversationId));
    const contatos = new Set(leadsFiltrados.map(l => l.contactNumber));

    // ── Metade de cima: aquisição ────────────────────────────────────────────
    const oppsFiltradas = opportunities.filter(o => conversationIds.has(o.conversationId));
    const porEtapa = new Map<string, { count: number; valor: number }>();
    let ganhos = 0;
    let ganhoValor = 0;
    for (const o of oppsFiltradas) {
      if (o.wonAt) { ganhos++; ganhoValor += o.dealValue; continue; }
      if (!o.stageId) continue;
      const cur = porEtapa.get(o.stageId) ?? { count: 0, valor: 0 };
      cur.count++; cur.valor += o.dealValue;
      porEtapa.set(o.stageId, cur);
    }

    // ── Metade de baixo: retenção e expansão ─────────────────────────────────
    const comprasPorContato = new Map<string, { count: number; valor: number }>();
    for (const c of compras) {
      if (!contatos.has(c.contactNumber)) continue;
      const cur = comprasPorContato.get(c.contactNumber) ?? { count: 0, valor: 0 };
      cur.count++; cur.valor += c.valor;
      comprasPorContato.set(c.contactNumber, cur);
    }
    const compradores = Array.from(comprasPorContato.values());
    const receitaTotal = compradores.reduce((s, c) => s + c.valor, 0);

    const avaliadores = new Set<string>();
    let somaNotas = 0; let qtdNotas = 0;
    for (const f of feedbacks) {
      if (!contatos.has(f.contactNumber)) continue;
      avaliadores.add(f.contactNumber);
      somaNotas += f.rating; qtdNotas++;
    }

    return {
      totalLeads: leadsFiltrados.length,
      porEtapa,
      ganhos,
      ganhoValor,
      compraram: comprasPorContato.size,
      receitaTotal,
      avaliaram: avaliadores.size,
      notaMedia: qtdNotas > 0 ? somaNotas / qtdNotas : null,
      recompraram: compradores.filter(c => c.count >= 2).length,
      fieis: compradores.filter(c => c.count >= 3).length,
    };
  }, [leads, opportunities, compras, feedbacks, origem]);

  const topo = useMemo(() => {
    if (!pipeline) return [];
    return [
      { id: "__leads__", nome: "Leads (conversas)", color: "#6b7280", count: dados.totalLeads, valor: null as number | null },
      ...pipeline.stages.map(s => {
        const d = dados.porEtapa.get(s.id) ?? { count: 0, valor: 0 };
        return { id: s.id, nome: s.name, color: s.color, count: d.count, valor: d.valor };
      }),
    ];
  }, [pipeline, dados]);

  const maxTopo = Math.max(1, ...topo.map(l => l.count), dados.ganhos);
  const maxBaixo = Math.max(1, dados.compraram, dados.avaliaram, dados.recompraram, dados.fieis);
  const conversaoGeral = dados.totalLeads > 0 ? (dados.compraram / dados.totalLeads) * 100 : 0;
  const taxaRecompra = dados.compraram > 0 ? (dados.recompraram / dados.compraram) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <p className="text-gray-400 text-sm">Atendimento</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
            <Filter size={26} className="text-blue-400" /> Funil ampulheta
          </h1>
          <p className="text-sm text-gray-500 mt-1">Aquisição em cima, compra no meio, retenção e expansão embaixo.</p>
        </div>

        {/* Origem */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "todos", label: "Todos", icon: Users, desc: "toda a base" },
            { key: "inbound", label: "Inbound", icon: Inbox, desc: "chegaram pelos canais" },
            { key: "outbound", label: "Outbound", icon: Megaphone, desc: "vieram da prospecção" },
          ] as const).map(o => (
            <button
              key={o.key}
              onClick={() => setOrigem(o.key)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                origem === o.key ? "border-blue-500 bg-blue-500/10" : "border-gray-800 bg-gray-900 hover:border-gray-600"
              }`}
            >
              <p className="text-sm font-semibold flex items-center gap-1.5"><o.icon size={14} /> {o.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{o.desc}</p>
            </button>
          ))}
        </div>

        {/* Resumo + seletor */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {pipelines.length > 1 ? (
            <select
              value={pipelineId}
              onChange={e => setPipelineId(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm font-medium"
            >
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <p className="text-sm font-medium text-gray-400">{pipeline?.name ?? "Sem pipeline"}</p>
          )}
          <p className="text-xs text-gray-500">
            Lead → cliente: <span className="font-bold text-green-400">{conversaoGeral.toFixed(1)}%</span>
            {" · "}Recompra: <span className="font-bold text-blue-400">{taxaRecompra.toFixed(0)}%</span>
            {" · "}Receita: <span className="font-bold text-green-400">{brl(dados.receitaTotal)}</span>
          </p>
        </div>

        {!pipeline ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center">
            <Filter size={36} className="mx-auto text-gray-600 mb-3" />
            <p className="font-medium text-gray-400">Nenhum pipeline criado</p>
            <Link href={`/crm/${agentId}/pipeline`} className="text-sm text-blue-400 hover:text-blue-300 mt-1 inline-block">
              Criar no Pipeline →
            </Link>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            {/* ── Metade de cima: AQUISIÇÃO (afunila) ── */}
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Aquisição</p>
            <div className="space-y-2">
              {topo.map((linha, i) => {
                const anterior = i > 0 ? topo[i - 1] : null;
                const conversao = anterior && anterior.count > 0 ? (linha.count / anterior.count) * 100 : null;
                return (
                  <div key={linha.id}>
                    {conversao !== null && <p className="text-[10px] text-gray-600 text-center mb-1">↓ {conversao.toFixed(0)}%</p>}
                    <Barra
                      count={linha.count}
                      max={maxTopo}
                      color={linha.color}
                      label={linha.nome}
                      sub={linha.valor !== null && linha.valor > 0 ? brl(linha.valor) : undefined}
                    />
                  </div>
                );
              })}
            </div>

            {/* ── Gargalo central: COMPRA ── */}
            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 border-t border-dashed border-gray-700" />
              <div className="bg-green-900/40 border border-green-700 rounded-full px-4 py-1.5 flex items-center gap-2">
                <Trophy size={13} className="text-green-400" />
                <span className="text-xs font-bold text-green-300">
                  {dados.ganhos} negócio{dados.ganhos === 1 ? "" : "s"} ganho{dados.ganhos === 1 ? "" : "s"}
                  {dados.ganhoValor > 0 && ` · ${brl(dados.ganhoValor)}`}
                </span>
              </div>
              <div className="flex-1 border-t border-dashed border-gray-700" />
            </div>

            {/* ── Metade de baixo: RETENÇÃO E EXPANSÃO ── */}
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Retenção e expansão</p>
            <div className="space-y-2">
              <Barra
                count={dados.compraram} max={maxBaixo} color="#22c55e"
                label="Clientes que compraram" icon={Users}
                sub={dados.receitaTotal > 0 ? brl(dados.receitaTotal) : undefined}
              />
              <Barra
                count={dados.avaliaram} max={maxBaixo} color="#a855f7"
                label="Avaliaram (pós-venda)" icon={Star}
                sub={dados.notaMedia !== null ? `nota média ${dados.notaMedia.toFixed(1)}/5` : undefined}
              />
              <Barra
                count={dados.recompraram} max={maxBaixo} color="#3b82f6"
                label="Recompraram (2+)" icon={RefreshCw}
                sub={dados.compraram > 0 ? `${taxaRecompra.toFixed(0)}% dos clientes` : undefined}
              />
              <Barra
                count={dados.fieis} max={maxBaixo} color="#f59e0b"
                label="Fiéis (3+ compras)" icon={Heart}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-gray-600">
          A metade de cima mostra a jornada até a compra (etapas do pipeline). A de baixo mostra o que acontece depois:
          quem comprou, quem avaliou no pós-venda, quem voltou a comprar e quem virou cliente fiel — alimentada pelos
          agentes de Pós-venda e Recompra. Inbound = chegou pelos canais; Outbound = abordado pela prospecção.
        </p>
      </div>
    </div>
  );
}
