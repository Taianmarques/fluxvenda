-- AlterTable: modo aprendizado — estado inicial do agente (IA não responde, só observa)
ALTER TABLE "AgentConfig" ADD COLUMN "learningMode" BOOLEAN NOT NULL DEFAULT false;
