-- AlterTable: vetor de embedding pra busca por similaridade (RAG) das conversas simuladas
ALTER TABLE "TrainingExample" ADD COLUMN "embedding" JSONB;
