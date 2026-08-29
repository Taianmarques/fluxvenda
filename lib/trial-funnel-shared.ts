// Etapas do funil de acompanhamento do teste grátis do CRM — o prazo/condição de cada etapa
// é fixo no código (só o texto da mensagem é editável pelo admin, em MessageTemplate). A
// lógica condicional de cada etapa vive em app/api/cron/trial-funil/route.ts; os campos
// abaixo servem só pra ordenar e descrever as etapas na tela de admin.
export type TrialFunnelStep = {
  id: string;
  anchorHours: number; // horas desde Team.createdAt a partir de quando a etapa pode disparar
  whenLabel: string; // descrição do prazo/condição, exibida na tela de admin
};

export const TRIAL_FUNNEL_STEPS: TrialFunnelStep[] = [
  { id: "TRIAL_D_2H_RECUPERAR", anchorHours: 2, whenLabel: "2 horas após o cadastro — só se ainda não mexeu em nada do checklist inicial" },
  { id: "TRIAL_D1_PRIMEIRA_OPORTUNIDADE", anchorHours: 24, whenLabel: "Dia 1 — só se ainda não tiver cadastrado nenhuma oportunidade" },
  { id: "TRIAL_D2_DOR_DEMO1", anchorHours: 48, whenLabel: "Dia 2 — 1º convite para demonstração" },
  { id: "TRIAL_D3_PROVA_SOCIAL", anchorHours: 72, whenLabel: "Dia 3" },
  { id: "TRIAL_D4_CONVIDAR_EQUIPE", anchorHours: 96, whenLabel: "Dia 4 — só se ainda não tiver convidado ninguém pra equipe" },
  { id: "TRIAL_D5_VALOR_DEMO2", anchorHours: 120, whenLabel: "Dia 5 — 2º convite para demonstração; pulado se já houver demo agendada, substituído por TRIAL_D5_POS_DEMO se a demo já tiver acontecido" },
  { id: "TRIAL_D5_POS_DEMO", anchorHours: 120, whenLabel: "Dia 5 — substitui o item acima quando a demonstração já foi realizada" },
  { id: "TRIAL_D6_AVISO_24H", anchorHours: 144, whenLabel: "Dia 6 — aviso de que o teste termina em 24 horas" },
  { id: "TRIAL_D7_CONVERTER", anchorHours: 168, whenLabel: "Dia 7 — convite pra assinar o plano pago" },
  { id: "TRIAL_D8_RECUPERAR_CONTA", anchorHours: 192, whenLabel: "Dia 8 — pós-trial, conta não ativada/convertida" },
  { id: "TRIAL_D10_OBJECAO", anchorHours: 240, whenLabel: "Dia 10 — tentativa de identificar objeção" },
  { id: "TRIAL_D14_ENCERRAR", anchorHours: 336, whenLabel: "Dia 14 — última mensagem, encerra o acompanhamento" },
];
