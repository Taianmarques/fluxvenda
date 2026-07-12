-- AlterTable: modo de agendamento da IA — true = envia o link da página pública (/agendar)
ALTER TABLE "AgentConfig" ADD COLUMN "schedulingViaLink" BOOLEAN NOT NULL DEFAULT false;
