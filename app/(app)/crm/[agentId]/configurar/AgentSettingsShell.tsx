"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Bot, SlidersHorizontal, Sparkles, Building2, Tag, Clock, Smartphone, Shuffle, Phone, BookOpen, BarChart3, ChevronRight, MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { AgentActions } from "./AgentActions";
import { WhatsappCloudConnect } from "./WhatsappCloudConnect";
import { DistribuicaoClient } from "./DistribuicaoClient";
import { PhoneAgentClient } from "./PhoneAgentClient";
import { ConfiguracoesBasicasPanel } from "./ConfiguracoesBasicasPanel";
import { PersonalidadePanel } from "./PersonalidadePanel";
import { SobreEmpresaPanel } from "./SobreEmpresaPanel";
import { ConfiguracaoComercialPanel } from "./ConfiguracaoComercialPanel";
import { FollowupPanel } from "./FollowupPanel";
import { TestAgentChat } from "./TestAgentChat";

type Section =
  | "agente" | "basico" | "personalidade" | "sobre-empresa" | "comercial" | "followup"
  | "canais" | "distribuicao" | "telefonia" | "conhecimento" | "analytics";

const SECTIONS: { key: Section; label: string; icon: LucideIcon }[] = [
  { key: "agente", label: "O Agente", icon: Bot },
  { key: "basico", label: "Configurações básicas", icon: SlidersHorizontal },
  { key: "personalidade", label: "Personalidade", icon: Sparkles },
  { key: "sobre-empresa", label: "Sobre a empresa", icon: Building2 },
  { key: "comercial", label: "Configuração comercial", icon: Tag },
  { key: "followup", label: "Follow-up", icon: Clock },
  { key: "canais", label: "Canais", icon: Smartphone },
  { key: "distribuicao", label: "Distribuição", icon: Shuffle },
  { key: "telefonia", label: "Telefonia", icon: Phone },
  { key: "conhecimento", label: "Conhecimento", icon: BookOpen },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-gray-400 mt-1">{desc}</p>
    </div>
  );
}

type WhatsappAgentConfig = {
  nome: string;
  tom: string;
  servicos: string[];
  objecoes: string[];
  horario: string;
  descricaoEmpresa: string;
  precos: string;
  enderecoContato: string;
  followupEnabled: boolean;
  followupDelaysMinutes: number[];
  emojiEnabled: boolean;
  responseDelaySeconds: number;
  agentSignatureEnabled: boolean;
};

export function AgentSettingsShell({
  agentId, nome, active, connectedLabel,
  conversasHoje, conversasSemana, totalConversas,
  appUrl, cloudConfigProps,
  leadDistributionMode,
  phoneConfig,
  segmento, whatsappAgentConfig,
  whatsappAiPaused, instagramAiPaused,
}: {
  agentId: string;
  nome: string;
  active: boolean;
  connectedLabel: string;
  conversasHoje: number;
  conversasSemana: number;
  totalConversas: number;
  appUrl: string;
  cloudConfigProps: React.ComponentProps<typeof WhatsappCloudConnect>["initialConfig"];
  leadDistributionMode: React.ComponentProps<typeof DistribuicaoClient>["initialMode"];
  phoneConfig: React.ComponentProps<typeof PhoneAgentClient>["initialConfig"];
  segmento?: { segmento: string; subsegmento: string };
  whatsappAgentConfig: WhatsappAgentConfig;
  whatsappAiPaused: boolean;
  instagramAiPaused: boolean;
}) {
  const [section, setSection] = useState<Section>("agente");

  const stats = [
    { label: "Conversas (hoje)", value: conversasHoje },
    { label: "Conversas (7 dias)", value: conversasSemana },
    { label: "Total de conversas", value: totalConversas },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex-shrink-0 space-y-5 md:sticky md:top-6">
        <Link href="/crm/hub" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 w-fit">
          <ArrowLeft size={12} /> Agentes de IA
        </Link>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <Bot size={28} className="text-white" />
          </div>
          <div>
            <p className="font-semibold truncate" title={nome}>{nome}</p>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border mt-1.5 ${
              active ? "bg-green-900/40 text-green-300 border-green-800/50" : "bg-yellow-900/40 text-yellow-300 border-yellow-800/50"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-400" : "bg-yellow-400"}`} />
              {active ? "Ativo" : "Pausado"}
            </span>
          </div>
        </div>

        <nav className="flex md:block gap-1 md:gap-0.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {SECTIONS.map(s => {
            const isActive = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex-shrink-0 md:flex-shrink ${
                  isActive ? "bg-blue-500/10 text-blue-400" : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <s.icon size={16} />
                  {s.label}
                </span>
                <ChevronRight size={14} className={`hidden md:block ${isActive ? "opacity-100" : "opacity-0"}`} />
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 w-full space-y-6">
        {section === "agente" && (
          <div className="space-y-6">
            <SectionHeader title="O Agente" desc={`Agente de atendimento conectado ${connectedLabel} da sua empresa.`} />

            <Link
              href={`/crm/${agentId}`}
              className="flex items-center justify-between gap-4 bg-gradient-to-r from-green-950/40 to-emerald-950/40 border border-green-800/50 rounded-2xl p-5 hover:border-green-600 transition-colors"
            >
              <div>
                <p className="font-semibold text-green-300 flex items-center gap-2"><MessageCircle size={18} /> Abrir CRM</p>
                <p className="text-sm text-gray-400 mt-1">Veja as conversas em tempo real, a agenda e assuma o atendimento manualmente quando precisar.</p>
              </div>
              <ArrowRight size={20} className="text-green-400 flex-shrink-0" />
            </Link>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold">Ações do agente</p>
                <p className="text-sm text-gray-400 mt-1">Pausar temporariamente ou desconectar o WhatsApp.</p>
              </div>
              <AgentActions agentId={agentId} active={active} />
            </div>

            <TestAgentChat agentId={agentId} />
          </div>
        )}

        {section === "basico" && (
          <div className="space-y-4">
            <SectionHeader title="Configurações básicas" desc="Delay das respostas, modo somente leitura, emojis e assinatura do agente." />
            <ConfiguracoesBasicasPanel
              agentId={agentId}
              initialResponseDelaySeconds={whatsappAgentConfig.responseDelaySeconds}
              initialReadOnly={whatsappAiPaused && instagramAiPaused}
              initialEmojiEnabled={whatsappAgentConfig.emojiEnabled}
              initialAgentSignatureEnabled={whatsappAgentConfig.agentSignatureEnabled}
            />
          </div>
        )}

        {section === "personalidade" && (
          <div className="space-y-4">
            <SectionHeader title="Personalidade" desc="Nome e tom de voz do agente." />
            <PersonalidadePanel
              agentId={agentId}
              initialNome={whatsappAgentConfig.nome}
              initialTom={whatsappAgentConfig.tom}
            />
          </div>
        )}

        {section === "sobre-empresa" && (
          <div className="space-y-4">
            <SectionHeader title="Sobre a empresa" desc="O que o agente sabe sobre o seu negócio para responder sem inventar." />
            <SobreEmpresaPanel
              agentId={agentId}
              segmento={segmento}
              initialDescricaoEmpresa={whatsappAgentConfig.descricaoEmpresa}
              initialEnderecoContato={whatsappAgentConfig.enderecoContato}
            />
          </div>
        )}

        {section === "comercial" && (
          <div className="space-y-4">
            <SectionHeader title="Configuração comercial" desc="Serviços, preços, objeções comuns e horário de atendimento." />
            <ConfiguracaoComercialPanel
              agentId={agentId}
              segmento={segmento}
              initialServicos={whatsappAgentConfig.servicos}
              initialPrecos={whatsappAgentConfig.precos}
              initialObjecoes={whatsappAgentConfig.objecoes}
              initialHorario={whatsappAgentConfig.horario}
            />
          </div>
        )}

        {section === "followup" && (
          <div className="space-y-4">
            <SectionHeader title="Follow-up" desc="Retomada automática quando o contato não responde." />
            <FollowupPanel
              agentId={agentId}
              initialFollowupEnabled={whatsappAgentConfig.followupEnabled}
              initialFollowupDelaysMinutes={whatsappAgentConfig.followupDelaysMinutes}
            />
          </div>
        )}

        {section === "canais" && (
          <div className="space-y-4">
            <SectionHeader title="Canais" desc="Conexão do agente com o WhatsApp (QR code ou API oficial da Meta)." />
            <WhatsappCloudConnect agentId={agentId} appUrl={appUrl} initialConfig={cloudConfigProps} />
          </div>
        )}

        {section === "distribuicao" && (
          <div className="space-y-4">
            <SectionHeader title="Distribuição" desc="Como as conversas são atribuídas aos atendentes da equipe." />
            <DistribuicaoClient agentId={agentId} initialMode={leadDistributionMode} />
          </div>
        )}

        {section === "telefonia" && (
          <div className="space-y-4">
            <SectionHeader title="Telefonia" desc="Ligações de voz do agente — número, gravação e a voz usada nas respostas em áudio." />
            <PhoneAgentClient agentId={agentId} initialConfig={phoneConfig} />
          </div>
        )}

        {section === "conhecimento" && (
          <div className="space-y-4">
            <SectionHeader title="Conhecimento" desc="Documentos e páginas que o agente consulta para responder sem inventar." />
            <Link
              href={`/crm/${agentId}/conhecimento`}
              className="flex items-center justify-between gap-4 bg-gray-900 border border-gray-800 hover:border-blue-700 rounded-2xl p-5 transition-colors"
            >
              <div>
                <p className="font-semibold flex items-center gap-2"><BookOpen size={18} className="text-blue-400" /> Base de conhecimento</p>
                <p className="text-sm text-gray-400 mt-1">Cadastre PDFs, links e textos que o agente usa como referência nas respostas.</p>
              </div>
              <ArrowRight size={20} className="text-gray-500 flex-shrink-0" />
            </Link>
          </div>
        )}

        {section === "analytics" && (
          <div className="space-y-4">
            <SectionHeader title="Analytics" desc="Volume de conversas do agente." />
            <div className="grid grid-cols-3 gap-4">
              {stats.map(m => (
                <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <p className="text-3xl font-bold text-blue-400">{m.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{m.label}</p>
                </div>
              ))}
            </div>
            <Link
              href={`/crm/${agentId}/dashboards`}
              className="flex items-center justify-between gap-4 bg-gray-900 border border-gray-800 hover:border-blue-700 rounded-2xl p-5 transition-colors"
            >
              <div>
                <p className="font-semibold flex items-center gap-2"><BarChart3 size={18} className="text-blue-400" /> Dashboards completos</p>
                <p className="text-sm text-gray-400 mt-1">Vendas, funil, agendamentos e desempenho da equipe.</p>
              </div>
              <ArrowRight size={20} className="text-gray-500 flex-shrink-0" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
