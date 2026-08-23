-- CreateTable: motivo de perda configurável (ver app/(app)/crm/motivos-perda/MotivosPerdaClient.tsx)
CREATE TABLE "MotivoPerda" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentConfigId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "MotivoPerda_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MotivoPerda" ADD CONSTRAINT "MotivoPerda_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: liga a negociação perdida ao motivo escolhido
ALTER TABLE "Opportunity" ADD COLUMN "motivoPerdaId" TEXT;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_motivoPerdaId_fkey" FOREIGN KEY ("motivoPerdaId") REFERENCES "MotivoPerda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
