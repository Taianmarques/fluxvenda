-- AlterTable: parâmetros ajustáveis da busca por similaridade (RAG) dos exemplos de treino
ALTER TABLE "AgentConfig" ADD COLUMN "ragSimilarityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "AgentConfig" ADD COLUMN "ragMaxResults" INTEGER NOT NULL DEFAULT 2;
