-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN "posVendaPesquisaEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AgentConfig" ADD COLUMN "posVendaReviewLink" TEXT NOT NULL DEFAULT '';
-- Pós-venda agora é agente próprio: desligado por padrão (antes seguia carteiraEnabled)
ALTER TABLE "AgentConfig" ALTER COLUMN "posVendaEnabled" SET DEFAULT false;

-- CreateTable
CREATE TABLE "PosVendaFeedback" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentConfigId" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PosVendaFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosVendaFeedback_agentConfigId_createdAt_idx" ON "PosVendaFeedback"("agentConfigId", "createdAt");

-- AddForeignKey
ALTER TABLE "PosVendaFeedback" ADD CONSTRAINT "PosVendaFeedback_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
