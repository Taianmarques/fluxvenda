-- CreateTable: base de conhecimento do agente (FAQs, regras, infos da empresa)
CREATE TABLE "ConhecimentoItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentConfigId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConhecimentoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConhecimentoItem_agentConfigId_idx" ON "ConhecimentoItem"("agentConfigId");

-- AddForeignKey
ALTER TABLE "ConhecimentoItem" ADD CONSTRAINT "ConhecimentoItem_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
