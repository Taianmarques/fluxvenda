-- AlterTable: formulários de captação criados por gestores no CRM (restritos ao agente deles)
ALTER TABLE "LeadForm" ADD COLUMN "agentOwned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LeadForm" ADD COLUMN "doneMessage" TEXT;
