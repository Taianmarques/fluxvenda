-- AlterEnum
ALTER TYPE "XPSource" ADD VALUE 'DEAL_WON';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "wonAt" TIMESTAMP(3);
