-- AlterTable: objetivo, fluxo de atendimento e regras de comportamento do agente
ALTER TABLE "AgentConfig" ADD COLUMN "objetivo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AgentConfig" ADD COLUMN "fluxoAtendimento" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AgentConfig" ADD COLUMN "comportamento" TEXT NOT NULL DEFAULT '';
