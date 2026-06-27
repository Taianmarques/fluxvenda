-- CreateEnum
CREATE TYPE "LeadDistributionMode" AS ENUM ('MANUAL', 'PRIMEIRO_A_ASSUMIR', 'RODIZIO', 'IA_QUALIFICACAO');

-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN "leadDistributionMode" "LeadDistributionMode" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "AgentConfig" ADD COLUMN "lastAssignedToId" TEXT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "assignedToId" TEXT;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
