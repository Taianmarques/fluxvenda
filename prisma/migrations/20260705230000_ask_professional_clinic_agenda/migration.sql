-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN "askProfessionalEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AgentConfig" ADD COLUMN "agendaAccessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AgentConfig_agendaAccessToken_key" ON "AgentConfig"("agendaAccessToken");
