import { DEFAULT_STAGES } from "@/lib/pipeline";

export type ChecklistStepKey = "canal" | "agente" | "equipe" | "pipeline" | "plano";

export type ChecklistStep = {
  key: ChecklistStepKey;
  label: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
};

type AgentForChecklist = {
  id: string;
  uazapiToken: string | null;
  cloudApiPhoneNumberId: string | null;
  systemPrompt: string | null;
};

type PipelineForChecklist = {
  agentConfigId: string;
  name: string;
  agenteInstrucoes: string;
  stages: { name: string; color: string; agenteInstrucoes: string; followupDelaysMinutes: unknown }[];
};

// Compara contra o default de seedDefaultPipeline() — qualquer desvio conta como customizado.
function isPipelineCustomized(pipelines: PipelineForChecklist[], agentId: string): boolean {
  const own = pipelines.filter(p => p.agentConfigId === agentId);
  if (own.length === 0) return false;
  if (own.length > 1) return true;
  const [p] = own;
  if (p.name !== "Pipeline Principal" || p.agenteInstrucoes) return true;
  if (p.stages.length !== DEFAULT_STAGES.length) return true;
  return p.stages.some((s, i) => {
    const d = DEFAULT_STAGES[i];
    const delays = Array.isArray(s.followupDelaysMinutes) ? s.followupDelaysMinutes : [];
    return s.name !== d.name || s.color !== d.color || Boolean(s.agenteInstrucoes) || delays.length > 0;
  });
}

export function buildCrmChecklist({
  configs,
  instagramAgentIds,
  pipelines,
  teamMemberCount,
  team,
}: {
  configs: AgentForChecklist[];
  instagramAgentIds: Set<string>;
  pipelines: PipelineForChecklist[];
  teamMemberCount: number;
  team: { crmTrialEndsAt: Date | null; productsOwned: string[] };
}): ChecklistStep[] {
  const firstAgentId = configs[0]?.id;
  // Enquanto não existe nenhum agente, os passos que dependem de um agentId caem na tela
  // de canais (que cria o agente por trás dos panos, sem pedir setor/nome antes de conectar).
  const canaisHref = firstAgentId ? `/crm/${firstAgentId}/canais` : "/crm/hub/canais";

  const canalConectado = configs.some(c => Boolean(c.uazapiToken) || Boolean(c.cloudApiPhoneNumberId) || instagramAgentIds.has(c.id));
  const agenteConfigurado = configs.some(c => Boolean(c.systemPrompt));
  const pipelineCustomizado = configs.some(c => isPipelineCustomized(pipelines, c.id));

  const now = Date.now();
  const trialAtiva = Boolean(team.crmTrialEndsAt && team.crmTrialEndsAt.getTime() > now);
  // Sem trial nunca setado (contratação direta) ou trial expirada com CRM ainda na lista de
  // produtos (convertida pra pago) = plano escolhido. Heurística — não há status de assinatura
  // dedicado no modelo hoje.
  const planoEscolhido = team.productsOwned.includes("CRM") && !trialAtiva;

  return [
    {
      key: "canal",
      label: "Conecte seu primeiro canal",
      description: "Centralize WhatsApp, Instagram ou outro canal para conversar com clientes sem sair do CRM.",
      done: canalConectado,
      href: canaisHref,
      cta: "Conectar canal",
    },
    {
      key: "equipe",
      label: "Convide alguém da sua equipe",
      description: "Adicione atendentes pra dividir as conversas e a operação com você.",
      done: teamMemberCount > 0,
      href: firstAgentId ? `/crm/${firstAgentId}/equipe` : canaisHref,
      cta: "Convidar equipe",
    },
    {
      key: "pipeline",
      label: "Personalize seus pipelines",
      description: "Ajuste as etapas do funil de vendas pro jeito que sua equipe trabalha.",
      done: pipelineCustomizado,
      href: firstAgentId ? `/crm/${firstAgentId}/pipeline` : canaisHref,
      cta: "Personalizar pipelines",
    },
    {
      key: "agente",
      label: "Configure seu agente de IA",
      description: "Defina o tom de voz, os serviços e as informações que a IA usa pra atender.",
      done: agenteConfigurado,
      href: firstAgentId ? `/crm/${firstAgentId}/configurar` : canaisHref,
      cta: "Configurar agente",
    },
    {
      key: "plano",
      label: "Escolha seu plano",
      done: planoEscolhido,
      description: "Garanta acesso completo ao CRM depois do período de teste.",
      href: "/produtos/crm",
      cta: "Ver planos",
    },
  ];
}
