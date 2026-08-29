-- CreateTable: marca quais etapas do funil de acompanhamento do teste grátis do CRM já
-- foram processadas por equipe, pra o cron não reenviar/reavaliar a mesma etapa sempre
CREATE TABLE "TrialFunnelSent" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialFunnelSent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrialFunnelSent_teamId_stepId_key" ON "TrialFunnelSent"("teamId", "stepId");

ALTER TABLE "TrialFunnelSent" ADD CONSTRAINT "TrialFunnelSent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: os 5 textos do funil de acompanhamento do teste grátis (checklist parado, convite de
-- demo, provas sociais) — mesma tabela MessageTemplate do funil de boas-vindas, editável em
-- /admin/funil-trial (tela separada da /admin/mensagens, mas mesmo mecanismo de banco).
INSERT INTO "MessageTemplate" ("id", "updatedAt", "label", "description", "body", "placeholders") VALUES
('TRIAL_CHECKLIST_NUDGE', CURRENT_TIMESTAMP, 'Lembrete: checklist inicial parado', 'Disparada 2 horas após o cadastro no teste grátis, só se nenhum passo do checklist inicial (Hub) tiver sido concluído ainda.',
E'Olá, {{name}}! 👋\n\nVi que você ainda não começou a configurar seu CRM. Que tal dar o primeiro passo agora? Leva só alguns minutinhos: conecte seu WhatsApp, convide sua equipe ou personalize seu funil de vendas.\n\nQualquer dúvida, é só responder aqui! 🚀',
  '["name"]'),
('TRIAL_DEMO_INVITE', CURRENT_TIMESTAMP, 'Convite para demonstração com especialista', 'Disparada 1 dia após o cadastro no teste grátis, só se ainda não houver demonstração agendada.',
E'Olá, {{name}}! 👋\n\nQue tal agendar uma demonstração gratuita com um especialista? Em poucos minutos a gente te mostra como tirar o máximo proveito do CRM pro seu negócio.\n\nÉ só acessar o Hub e clicar em "Agendar demonstração". 📅',
  '["name"]'),
('TRIAL_SOCIAL_PROOF_1', CURRENT_TIMESTAMP, 'Prova social #1', 'Disparada 2 dias após o cadastro no teste grátis.',
E'Olá, {{name}}! 👋\n\nSabia que empresas que usam o CRM da FluxVenda reduzem o tempo de resposta ao cliente em até 70%? A IA cuida do primeiro atendimento enquanto sua equipe foca em fechar negócio.\n\nContinue explorando o CRM — o resultado aparece rápido! 📈',
  '["name"]'),
('TRIAL_SOCIAL_PROOF_2', CURRENT_TIMESTAMP, 'Prova social #2', 'Disparada 4 dias após o cadastro no teste grátis.',
E'Olá, {{name}}! 👋\n\n"Depois que começamos a usar o CRM, nunca mais perdemos um lead por falta de resposta." — é o que a gente ouve de clientes todos os dias.\n\nJá configurou seu pipeline de vendas? Isso ajuda a IA a saber exatamente o que fazer em cada etapa. 🎯',
  '["name"]'),
('TRIAL_SOCIAL_PROOF_3', CURRENT_TIMESTAMP, 'Prova social #3', 'Disparada 6 dias após o cadastro no teste grátis (véspera do fim do trial).',
E'Olá, {{name}}! 👋\n\nSeu teste grátis está quase acabando! Empresas que continuam com o CRM depois do teste relatam aumento médio de 30% nas vendas fechadas pela IA.\n\nGaranta acesso completo antes que o teste expire. 🚀',
  '["name"]');
