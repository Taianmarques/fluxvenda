"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Inbox, Megaphone, Trophy, Users } from "lucide-react";

export type FunilPipeline = {
  id: string;
  name: string;
  stages: { id: string; name: string; color: string }[];
};

export type FunilLead = {
  conversationId: string;
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

type Origem = "todos" | "inbound" | "outbound";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FunilClient({ pipelines, leads, opportunities, agentId }: {
  pipelines: FunilPipeline[];
  leads: FunilLead[];
  opportunities: FunilOpp[];
  agentId: string;
}) {
  const [origem, setOrigem] = useState<Origem>("todos");
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");

  const pipeline = pipelines.find(p => p.id === pipelineId) ?? pipelines[0] ?? null;
  const origemByConversation = useMemo(() => new Map(leads.map(l => [l.conversationId, l.origem])), [leads]);

  const dados = useMemo(() => {
    const leadsFiltrados = origem === "todos" ? leads : leads.filter(l => l.origem === origem);
    const conversationIds = new Set(leadsFiltrados.map(l => l.conversationId));

    const oppsFiltradas = opportunities.filter(o =>
      conversationIds.has(o.conversationId) || (origem === "todos" && !origemByConversation.has(o.conversationId))
    );

    const porEtapa = new Map<string, { count: number; valor: number }>();
    let ganhos = 0;
    let ganhoValor = 0;
    for (const o of oppsFiltradas) {
      if (o.wonAt) {
        ganhos++;
        ganhoValor += o.dealValue;
        continue;
      }
      if (!o.stageId) continue;
      const cur = porEtapa.get(o.stageId) ?? { count: 0, valor: 0 };
      cur.count++;
      cur.valor += o.dealValue;
      porEtapa.set(o.stageId, cur);
    }

    return {
      totalLeads: leadsFiltrados.length,
      noFunil: oppsFiltradas.filter(o => !o.wonAt && o.stageId).length,
      ganhos,
      ganhoValor,
      porEtapa,
    };
  }, [leads, opportunities, origem, origemByConversation]);

  // Linhas do funil: Leads no topo → etapas do pipeline → Ganhos
  const linhas = useMemo(() => {
    if (!pipeline) return [];
    const rows: { id: string; nome: string; color: string; count: number; valor: number | null }[] = [
      { id: "__leads__", nome: "Leads (conversas)", color: "#6b7280", count: dados.totalLeads, valor: null },
      ...pipeline.stages.map(s => {
        const d = dados.porEtapa.get(s.id) ?? { count: 0, valor: 0 };
        return { id: s.id, nome: s.name, color: s.color, count: d.count, valor: d.valor };
      }),
      { id: "__ganhos__", nome: "Ganhos", color: "#22c55e", count: dados.ganhos, valor: dados.ganhoValor },
    ];
    return rows;
  }, [pipeline, dados]);

  const maxCount = Math.max(1, ...linhas.map(l => l.count));
  const conversaoGeral = dados.totalLeads > 0 ? (dados.ganhos / dados.totalLeads) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <p className="text-gray-400 text-sm">Atendimento</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
            <Filter size={26} className="text-blue-400" /> Funil
          </h1>
          <p className="text-sm text-gray-500 mt-1">Conversão etapa a etapa, separada por origem do lead.</p>
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

        {/* Pipeline selector + resumo */}
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
            Conversão geral: <span className={`font-bold ${conversaoGeral > 0 ? "text-green-400" : "text-gray-500"}`}>{conversaoGeral.toFixed(1)}%</span>
            {" · "}{dados.noFunil} no funil · {dados.ganhos} ganho{dados.ganhos === 1 ? "" : "s"} ({brl(dados.ganhoValor)})
          </p>
        </div>

        {/* Funil visual */}
        {!pipeline ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center">
            <Filter size={36} className="mx-auto text-gray-600 mb-3" />
            <p className="font-medium text-gray-400">Nenhum pipeline criado</p>
            <Link href={`/crm/${agentId}/pipeline`} className="text-sm text-blue-400 hover:text-blue-300 mt-1 inline-block">
              Criar no Pipeline →
            </Link>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            {linhas.map((linha, i) => {
              const anterior = i > 0 ? linhas[i - 1] : null;
              const conversao = anterior && anterior.count > 0 ? (linha.count / anterior.count) * 100 : null;
              const largura = Math.max(8, (linha.count / maxCount) * 100);
              const isGanhos = linha.id === "__ganhos__";
              const isLeads = linha.id === "__leads__";

              return (
                <div key={linha.id}>
                  {i > 0 && conversao !== null && (
                    <p className="text-[10px] text-gray-600 text-center mb-1">↓ {conversao.toFixed(0)}%</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-32 md:w-40 flex-shrink-0 text-right">
                      <p className={`text-xs font-medium truncate ${isGanhos ? "text-green-400" : isLeads ? "text-gray-400" : ""}`}>
                        {isGanhos && <Trophy size={10} className="inline mr-1" />}{linha.nome}
                      </p>
                      {linha.valor !== null && linha.valor > 0 && (
                        <p className="text-[10px] text-gray-500">{brl(linha.valor)}</p>
                      )}
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div
                        className="h-8 rounded-lg flex items-center justify-center transition-all"
                        style={{
                          width: `${largura}%`,
                          backgroundColor: `${linha.color}${isLeads ? "30" : "50"}`,
                          border: `1px solid ${linha.color}80`,
                        }}
                      >
                        <span className="text-xs font-bold">{linha.count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-600">
          Inbound = conversas que chegaram pelos canais (WhatsApp/Instagram). Outbound = contatos abordados pela prospecção ativa.
          Leads entram no funil quando ganham uma oportunidade (manual, por automação ou pelo avanço automático da IA).
        </p>
      </div>
    </div>
  );
}
