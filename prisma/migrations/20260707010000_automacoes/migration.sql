-- CreateTable
CREATE TABLE "Automacao" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentConfigId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "trigger" TEXT NOT NULL DEFAULT 'QUICK_REPLY',
    "quickReplyId" TEXT NOT NULL,
    "targetStageId" TEXT NOT NULL,

    CONSTRAINT "Automacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Automacao_agentConfigId_idx" ON "Automacao"("agentConfigId");

-- AddForeignKey
ALTER TABLE "Automacao" ADD CONSTRAINT "Automacao_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Automacao" ADD CONSTRAINT "Automacao_quickReplyId_fkey" FOREIGN KEY ("quickReplyId") REFERENCES "QuickReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Automacao" ADD CONSTRAINT "Automacao_targetStageId_fkey" FOREIGN KEY ("targetStageId") REFERENCES "PipelineStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
