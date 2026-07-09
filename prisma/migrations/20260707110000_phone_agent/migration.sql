-- CreateEnum
CREATE TYPE "PhoneCallStatus" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDA', 'PERDIDA', 'FALHADA');

-- AlterTable: campos do agente de ligação no AgentConfig
ALTER TABLE "AgentConfig"
  ADD COLUMN "phoneEnabled"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twilioAccountSid"  TEXT,
  ADD COLUMN "twilioAuthToken"   TEXT,
  ADD COLUMN "twilioPhoneNumber" TEXT,
  ADD COLUMN "elevenlabsApiKey"  TEXT,
  ADD COLUMN "elevenlabsVoiceId" TEXT,
  ADD COLUMN "phoneCallPrompt"   TEXT NOT NULL DEFAULT '';

-- CreateTable: PhoneCall
CREATE TABLE "PhoneCall" (
  "id"            TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "agentConfigId" TEXT NOT NULL,
  "direction"     TEXT NOT NULL,
  "contactNumber" TEXT NOT NULL,
  "contactName"   TEXT NOT NULL DEFAULT '',
  "status"        "PhoneCallStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
  "twilioCallSid" TEXT,
  "durationSecs"  INTEGER,
  "conversationId" TEXT,
  CONSTRAINT "PhoneCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PhoneCallTurn
CREATE TABLE "PhoneCallTurn" (
  "id"        TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "callId"    TEXT NOT NULL,
  "role"      TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "audioData" TEXT,
  CONSTRAINT "PhoneCallTurn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhoneCall_twilioCallSid_key" ON "PhoneCall"("twilioCallSid");
CREATE INDEX "PhoneCall_agentConfigId_createdAt_idx" ON "PhoneCall"("agentConfigId", "createdAt");
CREATE INDEX "PhoneCallTurn_callId_idx" ON "PhoneCallTurn"("callId");

-- AddForeignKey
ALTER TABLE "PhoneCall" ADD CONSTRAINT "PhoneCall_agentConfigId_fkey"
  FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PhoneCall" ADD CONSTRAINT "PhoneCall_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PhoneCallTurn" ADD CONSTRAINT "PhoneCallTurn_callId_fkey"
  FOREIGN KEY ("callId") REFERENCES "PhoneCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
