-- CreateTable
CREATE TABLE "Campanha" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentConfigId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "modo" TEXT NOT NULL DEFAULT 'NORMAL',
    "instrucoesIA" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ENVIANDO',
    "intervaloMinSeg" INTEGER NOT NULL DEFAULT 45,
    "intervaloMaxSeg" INTEGER NOT NULL DEFAULT 120,
    "nextSendAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Campanha_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampanhaDestinatario" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campanhaId" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "mensagemEnviada" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "CampanhaDestinatario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campanha_agentConfigId_idx" ON "Campanha"("agentConfigId");
CREATE INDEX "Campanha_status_nextSendAt_idx" ON "Campanha"("status", "nextSendAt");
CREATE INDEX "CampanhaDestinatario_campanhaId_status_idx" ON "CampanhaDestinatario"("campanhaId", "status");

-- AddForeignKey
ALTER TABLE "Campanha" ADD CONSTRAINT "Campanha_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampanhaDestinatario" ADD CONSTRAINT "CampanhaDestinatario_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
