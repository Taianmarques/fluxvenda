-- AlterTable AgentConfig
ALTER TABLE "AgentConfig" ADD COLUMN "carteiraEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgentConfig" ADD COLUMN "posVendaEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AgentConfig" ADD COLUMN "posVendaDelayHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "AgentConfig" ADD COLUMN "posVendaMensagem" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AgentConfig" ADD COLUMN "recompraEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AgentConfig" ADD COLUMN "recompraDias" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "AgentConfig" ADD COLUMN "carteiraInstrucoes" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "CarteiraTouch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentConfigId" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "CarteiraTouch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarteiraTouch_agentConfigId_contactNumber_type_idx" ON "CarteiraTouch"("agentConfigId", "contactNumber", "type");
CREATE INDEX "CarteiraTouch_agentConfigId_orderId_idx" ON "CarteiraTouch"("agentConfigId", "orderId");

-- AddForeignKey
ALTER TABLE "CarteiraTouch" ADD CONSTRAINT "CarteiraTouch_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
