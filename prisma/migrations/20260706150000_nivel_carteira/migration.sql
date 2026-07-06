-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN "carteiraInativoDias" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Conversation" ADD COLUMN "nivelCarteira" TEXT;
