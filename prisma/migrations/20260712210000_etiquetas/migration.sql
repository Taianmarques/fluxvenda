-- CreateTable: etiquetas estilo WhatsApp Business — várias por contato, por agente
CREATE TABLE "Etiqueta" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentConfigId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#6b7280',

    CONSTRAINT "Etiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Etiqueta_agentConfigId_idx" ON "Etiqueta"("agentConfigId");

-- AddForeignKey
ALTER TABLE "Etiqueta" ADD CONSTRAINT "Etiqueta_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable (join implícito Prisma: Conversation <-> Etiqueta)
CREATE TABLE "_ConversationToEtiqueta" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ConversationToEtiqueta_AB_pkey" ON "_ConversationToEtiqueta"("A", "B");

-- CreateIndex
CREATE INDEX "_ConversationToEtiqueta_B_index" ON "_ConversationToEtiqueta"("B");

-- AddForeignKey
ALTER TABLE "_ConversationToEtiqueta" ADD CONSTRAINT "_ConversationToEtiqueta_A_fkey" FOREIGN KEY ("A") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConversationToEtiqueta" ADD CONSTRAINT "_ConversationToEtiqueta_B_fkey" FOREIGN KEY ("B") REFERENCES "Etiqueta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
