-- CreateTable: templates das mensagens automáticas de venda/onboarding do CRM, disparadas
-- pela instância global de WhatsApp da plataforma — editável pelo super admin
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "placeholders" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- Seed: os 4 textos que hoje estavam hardcoded em lib/whatsapp.ts (buildWelcomeMessage e
-- buildDemoConfirmationMessage), migrados com o texto exatamente igual ao que já estava em uso.
INSERT INTO "MessageTemplate" ("id", "updatedAt", "label", "description", "body", "placeholders") VALUES
('WELCOME_GESTOR', CURRENT_TIMESTAMP, 'Boas-vindas — Gestor', 'Enviada por WhatsApp assim que uma conta de Gestor termina o cadastro/onboarding.',
E'Olá, {{name}}! 👋\n\nSeu cadastro na plataforma foi realizado com sucesso.\nA empresa *{{companyName}}* já está configurada.\n\nAcesse o painel do gestor e comece a estruturar o treinamento da sua equipe de vendas. 🚀',
  '["name","companyName"]'),
('WELCOME_VENDEDOR', CURRENT_TIMESTAMP, 'Boas-vindas — Vendedor', 'Enviada por WhatsApp assim que uma conta de Vendedor termina o cadastro/onboarding.',
E'Olá, {{name}}! 👋\n\nBem-vindo(a) à plataforma!\n\nSeu perfil de vendedor foi criado. Acesse seu dashboard e comece os treinamentos personalizados para o seu segmento. 🎯',
  '["name"]'),
('WELCOME_FUNCIONARIO', CURRENT_TIMESTAMP, 'Boas-vindas — Funcionário', 'Enviada por WhatsApp quando uma conta de Funcionário é criada — seja pelo próprio onboarding com convite, seja adicionada direto por um gestor em Equipe.',
E'Olá, {{name}}! 👋\n\nBem-vindo(a) à plataforma!\n\nSeu acesso como funcionário foi criado. Acesse seu dashboard e comece os treinamentos personalizados para a sua equipe. 🎯',
  '["name"]'),
('DEMO_CONFIRMACAO', CURRENT_TIMESTAMP, 'Confirmação de demonstração agendada', 'Enviada por WhatsApp para quem agenda uma demonstração do CRM (aba Recursos > Agendar uma demonstração).',
E'Olá, {{name}}! 👋\n\nSua demonstração do CRM FluxVenda está confirmada:\n\n📅 {{data}}\n🕐 {{hora}} ({{duracao}} min)\n\nQualquer imprevisto, é só responder esta mensagem.',
  '["name","data","hora","duracao"]');
