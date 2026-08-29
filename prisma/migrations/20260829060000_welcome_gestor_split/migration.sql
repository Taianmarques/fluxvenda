-- Separa a boas-vindas única de Gestor (WELCOME_GESTOR) em duas variantes por produto
-- contratado, já que o texto antigo falava só de "treinamento da equipe" — descrição errada
-- pra quem contratou CRM. Gestor com os dois produtos recebe só a de CRM (ver lib/whatsapp.ts).
DELETE FROM "MessageTemplate" WHERE "id" = 'WELCOME_GESTOR';

INSERT INTO "MessageTemplate" ("id", "updatedAt", "label", "description", "body", "placeholders") VALUES
('WELCOME_GESTOR_CRM', CURRENT_TIMESTAMP, 'Boas-vindas — Gestor (CRM)', 'Enviada por WhatsApp assim que uma conta de Gestor que contratou o CRM termina o cadastro/onboarding.',
E'Olá, {{name}}! 👋\n\nSeu cadastro na plataforma foi realizado com sucesso.\nA empresa *{{companyName}}* já está configurada.\n\nAcesse o painel do gestor e comece a configurar seu CRM: conecte o WhatsApp da sua empresa, monte seu pipeline de vendas e deixe a IA atendendo seus leads automaticamente. 🚀',
  '["name","companyName"]'),
('WELCOME_GESTOR_PLATAFORMA', CURRENT_TIMESTAMP, 'Boas-vindas — Gestor (Plataforma)', 'Enviada por WhatsApp assim que uma conta de Gestor que contratou só a Plataforma de treinamento (sem CRM) termina o cadastro/onboarding.',
E'Olá, {{name}}! 👋\n\nSeu cadastro na plataforma foi realizado com sucesso.\nA empresa *{{companyName}}* já está configurada.\n\nAcesse o painel do gestor e comece a estruturar o treinamento da sua equipe de vendas. 🚀',
  '["name","companyName"]');
