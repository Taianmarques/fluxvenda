-- AlterTable: sequência de mensagens automáticas configurável por formulário, disparada após o
-- convite (mesmo estilo do funil do teste grátis, mas editável por formulário em vez de fixo)
ALTER TABLE "LeadForm" ADD COLUMN "funnelSteps" JSONB NOT NULL DEFAULT '[]';

-- AlterTable: progresso da submissão nessa sequência
ALTER TABLE "LeadFormSubmission" ADD COLUMN "funnelStepsSent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "lastFunnelStepAt" TIMESTAMP(3);
