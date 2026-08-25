-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN     "responseDelaySeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "agentSignatureEnabled" BOOLEAN NOT NULL DEFAULT false;
