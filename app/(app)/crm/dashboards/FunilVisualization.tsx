"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Inbox, Megaphone, Users } from "lucide-react";

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

const AZUL = "#3b82f6";
const VERDE = "#22c55e";

type LinhaFunil = { id: string; nome: string; count: number; sub?: string };

// Fatia trapezoidal do funil — as larguras (top/bottom em %) desenham o triângulo
function Fatia({ wTop, wBot, color, count, label, sub, labelSide }: {
  wTop: number; wBot: number; color: string; count: number;
  label: string; sub?: string; labelSide: "left" | "right";
}) {
  const clip = `polygon(${(100 - wTop) / 2}% 0, ${(100 + wTop) / 2}% 0, ${(100 + wBot) / 2}% 100%, ${(100 - wBot) / 2}% 100%)`;
  const labelEl = (
    <div className={`w-28 md:w-40 flex-shrink-0 ${labelSide === "right" ? "text-left pl-2" : "text-right pr-2"}`}>
      <p className="text-xs font-semibold leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-gray-500 leading-tight">{sub}</p>}
    </div>
  );
  return (
    <div className="flex items-center mb-1 group">
      {labelSide === "left" ? labelEl : <div className="w-28 md:w-40 flex-shrink-0" />}
      <div className="flex-1 relative h-10 md:h-11">
        <div
          className="absolute inset-0 transition-transform duration-200 ease-out group-hover:scale-y-105"
          style={{
            clipPath: clip,
            backgroundColor: color,
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0) 45%, rgba(0,0,0,.12))",
            filter: "drop-shadow(0 3px 5px rgba(0,0,0,.35))",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white drop-shadow">{count}</span>
        </div>
      </div>
      {labelSide === "right" ? labelEl : <div className="w-28 md:w-40 flex-shrink-0" />}
    </div>
  );
}

export function FunilVisualization({ pipelines, leads, opportunities, compras, feedbacks, agentId }: {
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

  const linhasTopo: LinhaFunil[] = useMemo(() => {
    if (!pipeline) return [];
    return [
      { id: "__leads__", nome: "Leads", count: dados.totalLeads },
      ...pipeline.stages.map(s => {
        const d = dados.porEtapa.get(s.id) ?? { count: 0, valor: 0 };
        return { id: s.id, nome: s.name, count: d.count, sub: d.valor > 0 ? brl(d.valor) : undefined };
      }),
    ];
  }, [pipeline, dados]);

  const linhasBaixo: LinhaFunil[] = [
    { id: "compraram", nome: "Retenção", count: dados.compraram, sub: `compraram${dados.receitaTotal > 0 ? ` · ${brl(dados.receitaTotal)}` : ""}` },
    { id: "avaliaram", nome: "Satisfação", count: dados.avaliaram, sub: dados.notaMedia !== null ? `nota média ${dados.notaMedia.toFixed(1)}/5` : "avaliaram no pós-venda" },
    { id: "recompraram", nome: "Lealdade", count: dados.recompraram, sub: "recompraram (2+)" },
    { id: "fieis", nome: "Indicação", count: dados.fieis, sub: "clientes fiéis (3+)" },
  ];

  // Larguras do desenho: topo afunila de 100% até 26%; base abre de 26% até 100%
  const W_MAX = 100, W_MIN = 26;
  const wTopo = (i: number) => W_MAX - ((W_MAX - W_MIN) * i) / Math.max(1, linhasTopo.length);
  const wBaixo = (i: number) => W_MIN + ((W_MAX - W_MIN) * i) / Math.max(1, linhasBaixo.length);

  const conversaoGeral = dados.totalLeads > 0 ? (dados.compraram / dados.totalLeads) * 100 : 0;
  const taxaRecompra = dados.compraram > 0 ? (dados.recompraram / dados.compraram) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
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
            className={`rounded-2xl border p-3.5 text-left transition-all duration-150 ${
              origem === o.key
                ? "border-blue-500/70 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,.35)]"
                : "border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900"
            }`}
          >
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0 ${
                origem === o.key ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-400"
              }`}>
                <o.icon size={13} />
              </span>
              {o.label}
            </p>
            <p className="text-[10px] text-gray-500 mt-1 pl-8">{o.desc}</p>
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
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-900/60">
            Lead → cliente {conversaoGeral.toFixed(1)}%
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-900/60">
            Recompra {taxaRecompra.toFixed(0)}%
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-900/60">
            {brl(dados.receitaTotal)}
          </span>
        </div>
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
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 md:p-8 shadow-xl shadow-black/20">
          {/* Triângulo invertido — aquisição */}
          <div>
            {linhasTopo.map((linha, i) => (
              <Fatia
                key={linha.id}
                wTop={wTopo(i)}
                wBot={wTopo(i + 1)}
                color={AZUL}
                count={linha.count}
                label={linha.nome}
                sub={linha.sub}
                labelSide="right"
              />
            ))}
          </div>

          {/* Venda / Conversão */}
          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 border-t border-gray-800" />
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-gray-800/70 border border-gray-700 text-gray-300 whitespace-nowrap">
              Venda / Conversão
              <span className="text-gray-500 font-normal"> — {dados.ganhos} ganho{dados.ganhos === 1 ? "" : "s"}{dados.ganhoValor > 0 ? ` · ${brl(dados.ganhoValor)}` : ""}</span>
            </span>
            <div className="flex-1 border-t border-gray-800" />
          </div>

          {/* Pirâmide — retenção e expansão */}
          <div>
            {linhasBaixo.map((linha, i) => (
              <Fatia
                key={linha.id}
                wTop={wBaixo(i)}
                wBot={wBaixo(i + 1)}
                color={VERDE}
                count={linha.count}
                label={linha.nome}
                sub={linha.sub}
                labelSide="left"
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600">
        Descoberta → decisão nas etapas do seu pipeline; depois da venda, a base verde mostra retenção (compraram),
        satisfação (pós-venda), lealdade (recompra) e indicação (fiéis). Inbound = chegou pelos canais; Outbound = prospecção ativa.
      </p>
    </div>
  );
}
