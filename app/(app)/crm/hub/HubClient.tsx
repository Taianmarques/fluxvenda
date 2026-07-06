"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Headset, Calendar, ShoppingCart, Landmark, Target,
  MessageCircle, Instagram, Settings, ChevronRight, HeartHandshake, RefreshCw,
} from "lucide-react";

export type HubAgent = {
  id: string;
  nome: string;
  segmento: string;
  active: boolean;
  configured: boolean; // systemPrompt preenchido
  waConnected: boolean;
  igUsername: string | null; // null = não conectado; "" = conectado sem username
  schedulingEnabled: boolean;
  commerceEnabled: boolean;
  cobrancaEnabled: boolean;
  prospeccaoEnabled: boolean;
  posVendaEnabled: boolean;
  recompraEnabled: boolean;
  metricas: { conversas7d: number; vendas30d: number; vendas30dCount: number; agendaHoje: number; cobrancasAbertas: number; avaliacaoMedia: number | null; avaliacoes30d: number };
};

type ModuloKey = "schedulingEnabled" | "commerceEnabled" | "cobrancaEnabled" | "prospeccaoEnabled" | "posVendaEnabled" | "recompraEnabled";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function HubClient({ agents, isManager }: { agents: HubAgent[]; isManager: boolean }) {
  const [selectedId, setSelectedId] = useState(agents[0].id);
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<ModuloKey, boolean>>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const agent = agents.find(a => a.id === selectedId) ?? agents[0];
  const flag = (key: ModuloKey): boolean => overrides[agent.id]?.[key] ?? agent[key];

  async function toggleModulo(key: ModuloKey) {
    const next = !flag(key);
    setOverrides(prev => ({ ...prev, [agent.id]: { ...prev[agent.id], [key]: next } }));
    setSaving(key);
    try {
      await fetch(`/api/agentes/${agent.id}/modulos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
    } catch {
      setOverrides(prev => ({ ...prev, [agent.id]: { ...prev[agent.id], [key]: !next } }));
    } finally {
      setSaving(null);
    }
  }

  const AGENTES_IA: {
    key: ModuloKey | "atendimento";
    nome: string;
    desc: string;
    icon: typeof Headset;
    configHref: string;
    metrica?: string;
  }[] = [
    {
      key: "atendimento",
      nome: "Agente de Atendimento",
      desc: "Responde clientes 24/7 no WhatsApp e Instagram com o conhecimento da empresa: tira dúvidas, qualifica leads e conduz a conversa até a venda.",
      icon: Headset,
      configHref: `/ferramentas/whatsapp/${agent.id}`,
      metrica: `${agent.metricas.conversas7d} conversas em 7 dias`,
    },
    {
      key: "schedulingEnabled",
      nome: "Agente de Agendamento",
      desc: "Oferece horários reais, coleta as informações necessárias e marca sozinho — com lembrete de confirmação e agenda PWA para cada profissional.",
      icon: Calendar,
      configHref: `/crm/${agent.id}/agenda`,
      metrica: `${agent.metricas.agendaHoje} atendimento${agent.metricas.agendaHoje === 1 ? "" : "s"} hoje`,
    },
    {
      key: "commerceEnabled",
      nome: "Agente de Vendas",
      desc: "Apresenta o catálogo, monta pedidos, calcula entrega e cobra via Pix ou cartão — com catálogo online que o cliente navega e finaliza no WhatsApp.",
      icon: ShoppingCart,
      configHref: `/crm/${agent.id}/comercio`,
      metrica: agent.metricas.vendas30dCount > 0 ? `${brl(agent.metricas.vendas30d)} em 30 dias` : "sem vendas em 30 dias",
    },
    {
      key: "cobrancaEnabled",
      nome: "Agente de Cobrança",
      desc: "Cobra dívidas e boletos com cordialidade e firmeza: envia segunda via, prorroga vencimento e confirma pagamentos automaticamente.",
      icon: Landmark,
      configHref: `/crm/${agent.id}/cobranca`,
      metrica: `${agent.metricas.cobrancasAbertas} cobrança${agent.metricas.cobrancasAbertas === 1 ? "" : "s"} em aberto`,
    },
    {
      key: "prospeccaoEnabled",
      nome: "Agente de Prospecção",
      desc: "Encontra empresas no Google Maps pelo segmento e região, faz a primeira abordagem no WhatsApp e insiste com follow-ups programados.",
      icon: Target,
      configHref: `/crm/${agent.id}/prospeccao`,
    },
    {
      key: "posVendaEnabled",
      nome: "Agente de Pós-venda",
      desc: "Agradece após cada compra, faz pesquisa de satisfação (0 a 5), escala notas baixas para atendimento humano e pede avaliação no Google nas notas altas.",
      icon: HeartHandshake,
      configHref: `/crm/${agent.id}/carteira`,
      metrica: agent.metricas.avaliacaoMedia !== null
        ? `nota média ${agent.metricas.avaliacaoMedia.toFixed(1)}/5 (${agent.metricas.avaliacoes30d} avaliação${agent.metricas.avaliacoes30d === 1 ? "" : "ões"} em 30d)`
        : "sem avaliações ainda",
    },
    {
      key: "recompraEnabled",
      nome: "Agente de Recompra",
      desc: "Reativa clientes que pararam de comprar: identifica quem sumiu, escreve uma mensagem pessoal citando a última compra e traz de volta — um toque por ciclo, sem spam.",
      icon: RefreshCw,
      configHref: `/crm/${agent.id}/carteira`,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Seletor de número + canais */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {agents.length > 1 ? (
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm font-medium"
            >
              {agents.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          ) : (
            <p className="font-semibold">{agent.nome}</p>
          )}
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0 ${
            agent.active ? "bg-green-900/40 text-green-300 border-green-800/50" : "bg-gray-800 text-gray-400 border-gray-700"
          }`}>
            {agent.active ? "Ativo" : "Pausado"}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
            agent.waConnected ? "bg-green-900/30 text-green-300 border-green-800/50" : "bg-gray-800/60 text-gray-500 border-gray-700"
          }`}>
            <MessageCircle size={11} /> WhatsApp
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
            agent.igUsername !== null ? "bg-purple-900/30 text-purple-300 border-purple-800/50" : "bg-gray-800/60 text-gray-500 border-gray-700"
          }`}>
            <Instagram size={11} /> {agent.igUsername ? `@${agent.igUsername}` : "Instagram"}
          </span>
          <Link
            href={`/crm/${agent.id}/canais`}
            className="text-xs px-2.5 py-1 rounded-full border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            Gerenciar canais
          </Link>
        </div>
      </div>

      {/* Catálogo de agentes de IA */}
      <div className="grid md:grid-cols-2 gap-4">
        {AGENTES_IA.map(a => {
          const isAtendimento = a.key === "atendimento";
          const ligado = isAtendimento ? agent.active && agent.configured : flag(a.key as ModuloKey);

          return (
            <div
              key={a.key}
              className={`rounded-2xl border p-5 space-y-3 transition-colors ${
                ligado ? "bg-gray-900 border-blue-900/60" : "bg-gray-900/50 border-gray-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    ligado ? "bg-blue-600/20 text-blue-400" : "bg-gray-800 text-gray-600"
                  }`}>
                    <a.icon size={19} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{a.nome}</p>
                    <p className={`text-[11px] ${ligado ? "text-green-400" : "text-gray-600"}`}>
                      {ligado ? "Trabalhando" : (isAtendimento && !agent.configured ? "Precisa ser configurado" : "Desligado")}
                    </p>
                  </div>
                </div>

                {/* Toggle (atendimento se controla pela pág. de config/canais) */}
                {!isAtendimento && isManager && (
                  <button
                    onClick={() => toggleModulo(a.key as ModuloKey)}
                    disabled={saving === a.key}
                    aria-label={ligado ? `Desligar ${a.nome}` : `Ligar ${a.nome}`}
                    className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${ligado ? "bg-blue-600" : "bg-gray-700"} disabled:opacity-50`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ligado ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">{a.desc}</p>

              <div className="flex items-center justify-between gap-2 pt-1">
                {a.metrica && ligado
                  ? <p className="text-[11px] text-gray-500">{a.metrica}</p>
                  : <span />}
                <Link
                  href={a.configHref}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-0.5 flex-shrink-0"
                >
                  <Settings size={11} /> Configurar <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
