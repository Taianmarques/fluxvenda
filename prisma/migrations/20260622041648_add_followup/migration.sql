-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN     "followupDelayHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "followupEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "followupMaxAttempts" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "followupCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFollowupAt" TIMESTAMP(3);
