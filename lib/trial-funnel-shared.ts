// Etapas do funil de acompanhamento do teste grátis do CRM — o prazo/condição de cada
// etapa é fixo no código (só o texto da mensagem é editável pelo admin, em MessageTemplate).
// Usado pelo cron (app/api/cron/trial-funil/route.ts) e pela tela de admin (exibição).
export type TrialFunnelStep = {
  id: string;
  anchorHours: number; // horas desde Team.createdAt a partir de quando a etapa pode disparar
  whenLabel: string; // descrição do prazo/condição, exibida na tela de admin
};

export const TRIAL_FUNNEL_STEPS: TrialFunnelStep[] = [
  { id: "TRIAL_CHECKLIST_NUDGE", anchorHours: 2, whenLabel: "2 horas após o cadastro — só se o checklist inicial ainda estiver 0/5" },
  { id: "TRIAL_DEMO_INVITE", anchorHours: 24, whenLabel: "1 dia após o cadastro — só se ainda não houver demonstração agendada" },
  { id: "TRIAL_SOCIAL_PROOF_1", anchorHours: 48, whenLabel: "2 dias após o cadastro" },
  { id: "TRIAL_SOCIAL_PROOF_2", anchorHours: 96, whenLabel: "4 dias após o cadastro" },
  { id: "TRIAL_SOCIAL_PROOF_3", anchorHours: 144, whenLabel: "6 dias após o cadastro" },
];
