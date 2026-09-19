-- AlterTable: cada formulário pode rotear o lead pra um AgentConfig específico (null = agente
-- interno multi-setor da FluxVenda, comportamento antigo), com mensagem de abertura própria.
ALTER TABLE "LeadForm" ADD COLUMN "agentConfigId" TEXT;
ALTER TABLE "LeadForm" ADD COLUMN "inviteMessage" TEXT;

-- CreateIndex
CREATE INDEX "LeadForm_agentConfigId_idx" ON "LeadForm"("agentConfigId");

-- AddForeignKey
ALTER TABLE "LeadForm" ADD CONSTRAINT "LeadForm_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
