// Planos do CRM oferecidos na aba Recursos > Ver planos. Nomes e preços seguem a referência
// visual passada pelo usuário; textos de recursos adaptados pro que a FluxVenda já tem de
// verdade (Pipeline/Stage, Opportunity/Product, tags em Conversation, TeamMember, Automacao,
// AgentConfig/InstagramConnection). Cobrança avulsa mensal via Asaas — sem ciclo semestral/
// anual ainda (sem valor real definido) e sem aplicação automática dos limites listados.
export type CrmPlanTier = {
  id: string;
  label: string;
  description: string;
  valorCentavos: number;
  destaque?: boolean;
  features: string[];
};

export const CRM_PLAN_TIERS: CrmPlanTier[] = [
  {
    id: "STARTER",
    label: "Starter",
    description: "Para quem está começando, com recursos essenciais e limites ideais para pequenas equipes.",
    valorCentavos: 29700,
    features: [
      "Criação e gerenciamento de até 5 pipelines com até 8 etapas",
      "Criação e gerenciamento de negócios e produtos",
      "Gerenciamento de leads com controle de tags",
      "Cadastro de até 4 membros na equipe",
      "8 automações para otimizar interações com leads",
      "Multiatendimento com até 3 conexões (WhatsApp, Instagram e outros)",
    ],
  },
  {
    id: "ESSENTIAL",
    label: "Essential",
    description: "Funcionalidades avançadas e limites ampliados para empresas em crescimento constante.",
    valorCentavos: 46000,
    destaque: true,
    features: [
      "Criação e gerenciamento de até 20 pipelines com até 15 etapas",
      "Criação e gerenciamento de negócios e produtos",
      "Gerenciamento de leads com controle de tags",
      "Cadastro de até 15 membros na equipe",
      "20 automações para otimizar interações com leads",
      "Multiatendimento com até 10 conexões (WhatsApp, Instagram e outros)",
    ],
  },
  {
    id: "PRO",
    label: "Pro",
    description: "Funcionalidades avançadas e limites ampliados para empresas em crescimento constante.",
    valorCentavos: 99700,
    features: [
      "Criação e gerenciamento de pipelines ilimitadas com até 25 etapas",
      "Gerenciamento de leads com controle de tags",
      "Criação e gerenciamento de negócios e produtos",
      "Cadastro de até 40 membros na equipe",
      "80 automações para otimizar interações com leads",
      "Multiatendimento com até 50 conexões (WhatsApp, Instagram e outros)",
    ],
  },
  {
    id: "BUSINESS",
    label: "Business",
    description: "Todas as funcionalidades do CRM, sem limitações, pronto para escalar com máxima produtividade.",
    valorCentavos: 299700,
    features: [
      "Criação e gerenciamento de pipelines ilimitadas com até 25 etapas",
      "Gerenciamento ilimitado de leads com controle de tags",
      "Criação e gerenciamento de negócios e produtos",
      "Cadastro ilimitado de membros na equipe",
      "Automações ilimitadas para otimizar interações com leads",
      "Multiatendimento com conexões ilimitadas (WhatsApp, Instagram e outros)",
    ],
  },
];

export function getCrmPlanTier(id: string): CrmPlanTier | undefined {
  return CRM_PLAN_TIERS.find(p => p.id === id);
}
