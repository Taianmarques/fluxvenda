-- AlterTable: ritmo de disparo configurável da prospecção (seguro/moderado/rapido)
ALTER TABLE "AgentConfig" ADD COLUMN "prospeccaoRitmo" TEXT NOT NULL DEFAULT 'seguro';
