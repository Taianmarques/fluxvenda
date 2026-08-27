// Planos do CRM oferecidos na aba Recursos > Ver planos. Nomes, preços e os descontos por
// ciclo (semestral/anual) seguem a referência visual passada pelo usuário; textos de
// recursos adaptados pro que a FluxVenda já tem de verdade (Pipeline/Stage, Opportunity/
// Product, tags em Conversation, TeamMember, Automacao, AgentConfig/InstagramConnection).
// Cobrança avulsa e à vista por ciclo via Asaas (sem parcelamento, sem renovação automática
// — quem quiser o ciclo seguinte compra de novo) e sem aplicação automática dos limites listados.
export type BillingCycle = "MENSAL" | "SEMESTRAL" | "ANUAL";

export const BILLING_CYCLES: { id: BillingCycle; label: string; meses: number }[] = [
  { id: "ANUAL", label: "Anual", meses: 12 },
  { id: "SEMESTRAL", label: "Semestral", meses: 6 },
  { id: "MENSAL", label: "Mensal", meses: 1 },
];

type CyclePricing = { valorMensalCentavos: number; totalCentavos: number };

export type CrmPlanTier = {
  id: string;
  label: string;
  description: string;
  destaque?: boolean;
  features: string[];
  pricing: Record<BillingCycle, CyclePricing>;
};

export const CRM_PLAN_TIERS: CrmPlanTier[] = [
  {
    id: "STARTER",
    label: "Starter",
    description: "Para quem está começando, com recursos essenciais e limites ideais para pequenas equipes.",
    features: [
      "Criação e gerenciamento de até 5 pipelines com até 8 etapas",
      "Criação e gerenciamento de negócios e produtos",
      "Gerenciamento de leads com controle de tags",
      "Cadastro de até 4 membros na equipe",
      "8 automações para otimizar interações com leads",
      "Multiatendimento com até 3 conexões (WhatsApp, Instagram e outros)",
    ],
    pricing: {
      MENSAL: { valorMensalCentavos: 29700, totalCentavos: 29700 },
      SEMESTRAL: { valorMensalCentavos: 24620, totalCentavos: 147720 },
      ANUAL: { valorMensalCentavos: 21175, totalCentavos: 254097 },
    },
  },
  {
    id: "ESSENTIAL",
    label: "Essential",
    description: "Funcionalidades avançadas e limites ampliados para empresas em crescimento constante.",
    destaque: true,
    features: [
      "Criação e gerenciamento de até 20 pipelines com até 15 etapas",
      "Criação e gerenciamento de negócios e produtos",
      "Gerenciamento de leads com controle de tags",
      "Cadastro de até 15 membros na equipe",
      "20 automações para otimizar interações com leads",
      "Multiatendimento com até 10 conexões (WhatsApp, Instagram e outros)",
    ],
    pricing: {
      MENSAL: { valorMensalCentavos: 46000, totalCentavos: 46000 },
      SEMESTRAL: { valorMensalCentavos: 37983, totalCentavos: 227898 },
      ANUAL: { valorMensalCentavos: 33073, totalCentavos: 396872 },
    },
  },
  {
    id: "PRO",
    label: "Pro",
    description: "Funcionalidades avançadas e limites ampliados para empresas em crescimento constante.",
    features: [
      "Criação e gerenciamento de pipelines ilimitadas com até 25 etapas",
      "Gerenciamento de leads com controle de tags",
      "Criação e gerenciamento de negócios e produtos",
      "Cadastro de até 40 membros na equipe",
      "80 automações para otimizar interações com leads",
      "Multiatendimento com até 50 conexões (WhatsApp, Instagram e outros)",
    ],
    pricing: {
      MENSAL: { valorMensalCentavos: 99700, totalCentavos: 99700 },
      SEMESTRAL: { valorMensalCentavos: 82281, totalCentavos: 493687 },
      ANUAL: { valorMensalCentavos: 71318, totalCentavos: 855811 },
    },
  },
  {
    id: "BUSINESS",
    label: "Business",
    description: "Todas as funcionalidades do CRM, sem limitações, pronto para escalar com máxima produtividade.",
    features: [
      "Criação e gerenciamento de pipelines ilimitadas com até 25 etapas",
      "Gerenciamento ilimitado de leads com controle de tags",
      "Criação e gerenciamento de negócios e produtos",
      "Cadastro ilimitado de membros na equipe",
      "Automações ilimitadas para otimizar interações com leads",
      "Multiatendimento com conexões ilimitadas (WhatsApp, Instagram e outros)",
    ],
    pricing: {
      MENSAL: { valorMensalCentavos: 299700, totalCentavos: 299700 },
      SEMESTRAL: { valorMensalCentavos: 247011, totalCentavos: 1482068 },
      ANUAL: { valorMensalCentavos: 212452, totalCentavos: 2549422 },
    },
  },
];

export function getCrmPlanTier(id: string): CrmPlanTier | undefined {
  return CRM_PLAN_TIERS.find(p => p.id === id);
}

export function getSavingsCentavos(tier: CrmPlanTier, cycle: BillingCycle): number {
  return tier.pricing.MENSAL.valorMensalCentavos - tier.pricing[cycle].valorMensalCentavos;
}
