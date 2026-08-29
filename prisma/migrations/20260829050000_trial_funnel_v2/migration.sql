-- AlterTable: dedupe do aviso de lead quente pro comercial (ver lib/hot-lead-alert.ts)
ALTER TABLE "Team" ADD COLUMN "hotLeadAlertedAt" TIMESTAMP(3);

-- Substitui o funil de acompanhamento do teste grátis (versão simples de 5 etapas) por uma
-- sequência de 12 mensagens ao longo de 14 dias, com gatilhos de dia/hora e condições mais
-- específicas (ver lib/trial-funnel-shared.ts e app/api/cron/trial-funil/route.ts).
DELETE FROM "MessageTemplate" WHERE "id" IN (
  'TRIAL_CHECKLIST_NUDGE', 'TRIAL_DEMO_INVITE', 'TRIAL_SOCIAL_PROOF_1', 'TRIAL_SOCIAL_PROOF_2', 'TRIAL_SOCIAL_PROOF_3'
);

INSERT INTO "MessageTemplate" ("id", "updatedAt", "label", "description", "body", "placeholders") VALUES
('TRIAL_D_2H_RECUPERAR', CURRENT_TIMESTAMP, 'Recuperar quem ainda não acessou', 'Disparada 2 horas após o cadastro no teste grátis, só se nenhum passo do checklist inicial (Hub) tiver sido concluído ainda.',
E'Olá, {{name}}! 👋\n\nVi que você ainda não começou a configurar seu CRM. Que tal dar o primeiro passo agora? Leva só alguns minutinhos: conecte seu WhatsApp, convide sua equipe ou personalize seu funil de vendas.\n\nQualquer dúvida, é só responder aqui! 🚀',
  '["name"]'),
('TRIAL_D1_PRIMEIRA_OPORTUNIDADE', CURRENT_TIMESTAMP, 'Cadastrar primeira oportunidade', 'Disparada no dia 1 do teste grátis, só se a equipe ainda não tiver cadastrado nenhuma oportunidade no CRM.',
E'Olá, {{name}}! 👋\n\nQue tal cadastrar sua primeira oportunidade no CRM? É o jeito mais rápido de ver a IA trabalhando de verdade: acompanhando a conversa, movendo o card pelo funil e te avisando na hora certa.\n\nAcesse o Pipeline e crie a primeira agora. 🎯',
  '["name"]'),
('TRIAL_D2_DOR_DEMO1', CURRENT_TIMESTAMP, 'Dor + 1º convite para demonstração', 'Disparada no dia 2 do teste grátis. Sempre dispara (é o primeiro convite de demo do funil).',
E'Olá, {{name}}! 👋\n\nQuantas oportunidades sua equipe perde hoje por demorar pra responder um lead? Com o CRM, a IA responde na hora, todo santo dia, sem folga.\n\nQue tal ver isso funcionando na prática? Agende uma demonstração gratuita com um especialista — 20 minutos, sem compromisso. 📅',
  '["name"]'),
('TRIAL_D3_PROVA_SOCIAL', CURRENT_TIMESTAMP, 'Prova social', 'Disparada no dia 3 do teste grátis.',
E'Olá, {{name}}! 👋\n\nEmpresas que usam o CRM da FluxVenda reduzem o tempo de resposta ao cliente em até 70% — a IA cuida do primeiro atendimento enquanto sua equipe foca em fechar negócio.\n\nContinue explorando o CRM, o resultado aparece rápido! 📈',
  '["name"]'),
('TRIAL_D4_CONVIDAR_EQUIPE', CURRENT_TIMESTAMP, 'Convidar equipe e mostrar gestão', 'Disparada no dia 4 do teste grátis, só se a equipe ainda não tiver convidado ninguém.',
E'Olá, {{name}}! 👋\n\nJá convidou sua equipe pro CRM? Cada atendente pode ter seu próprio acesso, ver só as conversas dele e você acompanha tudo de cima, com metas e relatórios de gestão.\n\nAcesse Equipe e adicione o primeiro membro. 👥',
  '["name"]'),
('TRIAL_D5_VALOR_DEMO2', CURRENT_TIMESTAMP, 'Prova de valor + 2º convite para demonstração', 'Disparada no dia 5 do teste grátis. Pulada se já houver demonstração agendada; substituída por "Pós-demonstração" se a demonstração já tiver acontecido.',
E'Olá, {{name}}! 👋\n\nSeu teste grátis está passando rápido! Times que usam o CRM no dia a dia relatam aumento médio de 30% nas vendas fechadas com a ajuda da IA.\n\nAinda dá tempo de agendar uma demonstração gratuita com um especialista e tirar todas as suas dúvidas. 📅',
  '["name"]'),
('TRIAL_D5_POS_DEMO', CURRENT_TIMESTAMP, 'Pós-demonstração (substitui o 2º convite)', 'Disparada no dia 5 no lugar da mensagem acima, quando a demonstração agendada já aconteceu.',
E'Olá, {{name}}! 👋\n\nFoi ótimo te mostrar o CRM na demonstração! Ficou alguma dúvida sobre como aplicar no seu negócio? É só responder essa mensagem que a gente te ajuda a tirar o máximo proveito do teste grátis. 🙌',
  '["name"]'),
('TRIAL_D6_AVISO_24H', CURRENT_TIMESTAMP, 'Aviso: teste termina em 24 horas', 'Disparada no dia 6 do teste grátis.',
E'Olá, {{name}}! 👋\n\nSeu teste grátis do CRM termina em 24 horas! Depois disso, o acesso é bloqueado até você escolher um plano.\n\nGaranta a continuidade agora mesmo, sem perder o que já configurou. 🚀',
  '["name"]'),
('TRIAL_D7_CONVERTER', CURRENT_TIMESTAMP, 'Converter para o plano pago', 'Disparada no dia 7 do teste grátis (último dia).',
E'Olá, {{name}}! 👋\n\nHoje é o último dia do seu teste grátis! Escolha um plano agora e mantenha tudo funcionando sem interrupção: sua equipe, seus pipelines e a IA já treinada.\n\nÉ rápido, acesse a tela de planos e escolha o que faz mais sentido pro seu momento. 💳',
  '["name"]'),
('TRIAL_D8_RECUPERAR_CONTA', CURRENT_TIMESTAMP, 'Recuperar conta não ativada', 'Disparada no dia 8, um dia após o fim do teste grátis, pra quem ainda não converteu.',
E'Olá, {{name}}! 👋\n\nSeu teste grátis do CRM terminou e sua conta ficou sem plano ativo. Ainda dá tempo de reativar e continuar de onde parou — nada do que você configurou foi perdido.\n\nQuer ajuda pra escolher o plano certo? É só responder essa mensagem. 🙌',
  '["name"]'),
('TRIAL_D10_OBJECAO', CURRENT_TIMESTAMP, 'Identificar objeção', 'Disparada no dia 10, pra quem ainda não converteu.',
E'Olá, {{name}}! 👋\n\nPercebi que você ainda não voltou a ativar o CRM. Teve alguma dificuldade ou dúvida que te impediu de continuar? Me conta aqui — às vezes um ajuste rápido resolve.\n\nEstamos à disposição pra te ajudar a decidir. 🤝',
  '["name"]'),
('TRIAL_D14_ENCERRAR', CURRENT_TIMESTAMP, 'Encerrar acompanhamento', 'Última mensagem do funil, disparada no dia 14 pra quem ainda não converteu.',
E'Olá, {{name}}! 👋\n\nEssa é nossa última mensagem por aqui — não queremos ser inconvenientes! Se mudar de ideia, o CRM continua disponível pra você quando quiser voltar.\n\nFoi um prazer te acompanhar nesses dias. Sucesso nas vendas! 🚀',
  '["name"]');
