-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "leadStatusId" TEXT;

-- CreateTable
CREATE TABLE "LeadStatus" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LeadStatus_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LeadStatus" ADD CONSTRAINT "LeadStatus_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadStatusId_fkey" FOREIGN KEY ("leadStatusId") REFERENCES "LeadStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
