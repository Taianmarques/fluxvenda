-- AlterTable: configuração do retrieval de Treino por agente
ALTER TABLE "AgentConfig" ADD COLUMN     "treinoSimilaridadeMinima" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "treinoMaxExemplos" INTEGER NOT NULL DEFAULT 2;

-- CreateTable: exemplos de atendimento simulado (RAG por embedding, ver lib/embeddings.ts)
CREATE TABLE "TreinoExemplo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentConfigId" TEXT NOT NULL,
    "cenario" TEXT NOT NULL,
    "turnos" JSONB NOT NULL,
    "embedding" JSONB,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "TreinoExemplo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreinoExemplo_agentConfigId_idx" ON "TreinoExemplo"("agentConfigId");

-- AddForeignKey
ALTER TABLE "TreinoExemplo" ADD CONSTRAINT "TreinoExemplo_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreinoExemplo" ADD CONSTRAINT "TreinoExemplo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
