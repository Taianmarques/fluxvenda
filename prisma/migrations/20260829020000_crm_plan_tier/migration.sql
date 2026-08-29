-- CreateTable: planos do CRM editáveis pelo super admin (antes hardcoded em lib/crm-plans.ts)
CREATE TABLE "CrmPlanTier" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "features" JSONB NOT NULL DEFAULT '[]',
    "precoMensalCentavos" INTEGER NOT NULL DEFAULT 0,
    "precoSemestralCentavos" INTEGER NOT NULL DEFAULT 0,
    "precoAnualCentavos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CrmPlanTier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmPlanTier_active_order_idx" ON "CrmPlanTier"("active", "order");

-- Seed: migra os 4 planos que estavam hardcoded em lib/crm-plans.ts pra não perder os
-- valores/textos já em uso na grade pública.
INSERT INTO "CrmPlanTier" ("id", "updatedAt", "label", "description", "destaque", "order", "active", "features", "precoMensalCentavos", "precoSemestralCentavos", "precoAnualCentavos") VALUES
('STARTER', CURRENT_TIMESTAMP, 'Starter', 'Para quem está começando, com recursos essenciais e limites ideais para pequenas equipes.', false, 0, true,
  '["Criação e gerenciamento de até 5 pipelines com até 8 etapas","Criação e gerenciamento de negócios e produtos","Gerenciamento de leads com controle de tags","Cadastro de até 4 membros na equipe","8 automações para otimizar interações com leads","Multiatendimento com até 3 conexões (WhatsApp, Instagram e outros)"]',
  29700, 147720, 254097),
('ESSENTIAL', CURRENT_TIMESTAMP, 'Essential', 'Funcionalidades avançadas e limites ampliados para empresas em crescimento constante.', true, 1, true,
  '["Criação e gerenciamento de até 20 pipelines com até 15 etapas","Criação e gerenciamento de negócios e produtos","Gerenciamento de leads com controle de tags","Cadastro de até 15 membros na equipe","20 automações para otimizar interações com leads","Multiatendimento com até 10 conexões (WhatsApp, Instagram e outros)"]',
  46000, 227898, 396872),
('PRO', CURRENT_TIMESTAMP, 'Pro', 'Funcionalidades avançadas e limites ampliados para empresas em crescimento constante.', false, 2, true,
  '["Criação e gerenciamento de pipelines ilimitadas com até 25 etapas","Gerenciamento de leads com controle de tags","Criação e gerenciamento de negócios e produtos","Cadastro de até 40 membros na equipe","80 automações para otimizar interações com leads","Multiatendimento com até 50 conexões (WhatsApp, Instagram e outros)"]',
  99700, 493687, 855811),
('BUSINESS', CURRENT_TIMESTAMP, 'Business', 'Todas as funcionalidades do CRM, sem limitações, pronto para escalar com máxima produtividade.', false, 3, true,
  '["Criação e gerenciamento de pipelines ilimitadas com até 25 etapas","Gerenciamento ilimitado de leads com controle de tags","Criação e gerenciamento de negócios e produtos","Cadastro ilimitado de membros na equipe","Automações ilimitadas para otimizar interações com leads","Multiatendimento com conexões ilimitadas (WhatsApp, Instagram e outros)"]',
  299700, 1482068, 2549422);
