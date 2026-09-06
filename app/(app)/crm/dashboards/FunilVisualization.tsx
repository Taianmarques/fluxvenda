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
const VERDES = ["#22c55e", "#16a34a", "#0d9488", "#0891b2"];
const FLOOR = 12; // largura mínima (%) para uma etapa continuar visível mesmo com 0

// Luminância aproximada — decide se o texto em cima da cor precisa ser claro ou escuro
function textOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#fff";
}

// Escala em raiz quadrada: comprime a cauda longa (ex: 25 vs 0) sem esconder diferenças médias
function largura(count: number, max: number) {
  const ratio = Math.sqrt(Math.min(1, count / Math.max(1, max)));
  return FLOOR + (100 - FLOOR) * ratio;
}

function corConversao(pct: number) {
  if (pct >= 70) return "text-green-400 border-green-800 bg-green-950/60";
  if (pct >= 40) return "text-amber-400 border-amber-800 bg-amber-950/60";
  return "text-red-400 border-red-800 bg-red-950/60";
}

type LinhaFunil = { id: string; nome: string; count: number; sub?: string; color: string };

// Fatia trapezoidal do funil — as larguras (top/bottom em %) desenham o triângulo, proporcionais ao valor real
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
    <div className="flex items-center">
      {labelSide === "left" ? labelEl : <div className="w-28 md:w-40 flex-shrink-0" />}
      <div className="flex-1 relative h-10 md:h-11">
        <div
          className="absolute inset-0 transition-[clip-path] duration-300"
          style={{ clipPath: clip, backgroundColor: color, backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.16), rgba(0,0,0,.10))" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold drop-shadow" style={{ color: textOn(color) }}>{count}</span>
        </div>
      </div>
      {labelSide === "right" ? labelEl : <div className="w-28 md:w-40 flex-shrink-0" />}
    </div>
  );
}

// Badge de conversão entre duas etapas consecutivas — fica sempre sobre a faixa da barra, entre os dois espaços reservados ao label
function Conversao({ de, para }: { de: number; para: number }) {
  if (de <= 0) return <div className="h-4" />;
  const pct = Math.round((para / de) * 100);
  return (
    <div className="flex items-center justify-center h-4 px-28 md:px-40">
      <span className={`text-[9px] font-bold px-1.5 rounded-full border leading-tight -translate-y-1/2 ${corConversao(pct)}`}>
        {pct}%
      </span>
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
      { id: "__leads__", nome: "Leads", count: dados.totalLeads, color: AZUL },
      ...pipeline.stages.map(s => {
        const d = dados.porEtapa.get(s.id) ?? { count: 0, valor: 0 };
        return { id: s.id, nome: s.name, count: d.count, sub: d.valor > 0 ? brl(d.valor) : undefined, color: s.color || AZUL };
      }),
    ];
  }, [pipeline, dados]);

  const linhasBaixo: LinhaFunil[] = [
    { id: "compraram", nome: "Retenção", count: dados.compraram, sub: `compraram${dados.receitaTotal > 0 ? ` · ${brl(dados.receitaTotal)}` : ""}`, color: VERDES[0] },
    { id: "avaliaram", nome: "Satisfação", count: dados.avaliaram, sub: dados.notaMedia !== null ? `nota média ${dados.notaMedia.toFixed(1)}/5` : "avaliaram no pós-venda", color: VERDES[1] },
    { id: "recompraram", nome: "Lealdade", count: dados.recompraram, sub: "recompraram (2+)", color: VERDES[2] },
    { id: "fieis", nome: "Indicação", count: dados.fieis, sub: "clientes fiéis (3+)", color: VERDES[3] },
  ];

  // Larguras proporcionais aos valores reais (escala em raiz quadrada), numa única referência
  // pra todo o funil — assim "Perdido" e "Novo Lead" só ficam do mesmo tamanho se tiverem o mesmo valor.
  const maxGeral = Math.max(dados.totalLeads, 1);
  const wTopo = (i: number) => (i < linhasTopo.length ? largura(linhasTopo[i].count, maxGeral) : FLOOR);
  const wBaixo = (i: number) => (i < linhasBaixo.length ? largura(linhasBaixo[i].count, maxGeral) : FLOOR);

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
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-8">
          {/* Triângulo invertido — aquisição */}
          <div>
            {linhasTopo.map((linha, i) => (
              <div key={linha.id}>
                <Fatia
                  wTop={wTopo(i)}
                  wBot={wTopo(i + 1)}
                  color={linha.color}
                  count={linha.count}
                  label={linha.nome}
                  sub={linha.sub}
                  labelSide="right"
                />
                {i < linhasTopo.length - 1 && <Conversao de={linha.count} para={linhasTopo[i + 1].count} />}
              </div>
            ))}
          </div>

          {/* Venda / Conversão */}
          <div className="my-3 flex items-center gap-3">
            <div className="flex-1 border-t border-dashed border-gray-600" />
            <span className="text-xs font-semibold text-gray-300">
              Venda / Conversão
              <span className="text-gray-500 font-normal"> — {dados.ganhos} ganho{dados.ganhos === 1 ? "" : "s"}{dados.ganhoValor > 0 ? ` · ${brl(dados.ganhoValor)}` : ""}</span>
            </span>
            <div className="flex-1 border-t border-dashed border-gray-600" />
          </div>

          {/* Camadas de fidelização — retenção, satisfação, recompra, indicação */}
          <div>
            {linhasBaixo.map((linha, i) => (
              <div key={linha.id}>
                <Fatia
                  wTop={wBaixo(i)}
                  wBot={wBaixo(i + 1)}
                  color={linha.color}
                  count={linha.count}
                  label={linha.nome}
                  sub={linha.sub}
                  labelSide="left"
                />
                {i < linhasBaixo.length - 1 && <Conversao de={linha.count} para={linhasBaixo[i + 1].count} />}
              </div>
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
