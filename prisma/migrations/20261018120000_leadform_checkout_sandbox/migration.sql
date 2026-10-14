-- Modo teste do checkout do quiz (conta sandbox da plataforma)
ALTER TABLE "LeadForm" ADD COLUMN "checkoutSandbox" BOOLEAN NOT NULL DEFAULT false;
