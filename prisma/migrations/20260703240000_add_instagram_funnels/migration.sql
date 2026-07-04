-- Adiciona funnelId opcional em InstagramCommentFlow
ALTER TABLE "InstagramCommentFlow"
  ALTER COLUMN "replyMessage" SET DEFAULT '',
  ADD COLUMN "funnelId" TEXT;

-- Enum FunnelBlockType
CREATE TYPE "FunnelBlockType" AS ENUM ('MESSAGE', 'DELAY', 'CONDITION');

-- Enum FunnelExecStatus
CREATE TYPE "FunnelExecStatus" AS ENUM ('RUNNING', 'WAITING_DELAY', 'WAITING_INPUT', 'COMPLETED');

-- Tabela de funis
CREATE TABLE "InstagramFunnel" (
    "id"            TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentConfigId" TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "active"        BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "InstagramFunnel_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InstagramFunnel_agentConfigId_idx" ON "InstagramFunnel"("agentConfigId");

-- Tabela de blocos
CREATE TABLE "InstagramFunnelBlock" (
    "id"           TEXT NOT NULL,
    "funnelId"     TEXT NOT NULL,
    "type"         "FunnelBlockType" NOT NULL,
    "order"        INTEGER NOT NULL DEFAULT 0,
    "content"      TEXT,
    "delayMinutes" INTEGER,
    "branches"     JSONB,
    CONSTRAINT "InstagramFunnelBlock_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InstagramFunnelBlock_funnelId_order_idx" ON "InstagramFunnelBlock"("funnelId", "order");

-- Tabela de execuções
CREATE TABLE "InstagramFunnelExecution" (
    "id"                  TEXT NOT NULL,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "funnelId"            TEXT NOT NULL,
    "agentConfigId"       TEXT NOT NULL,
    "contactIgsid"        TEXT NOT NULL,
    "igBusinessAccountId" TEXT NOT NULL,
    "pageAccessToken"     TEXT NOT NULL,
    "blockIndex"          INTEGER NOT NULL DEFAULT 0,
    "status"              "FunnelExecStatus" NOT NULL DEFAULT 'RUNNING',
    "resumeAt"            TIMESTAMP(3),
    CONSTRAINT "InstagramFunnelExecution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InstagramFunnelExecution_agentConfigId_contactIgsid_status_idx"
    ON "InstagramFunnelExecution"("agentConfigId", "contactIgsid", "status");
CREATE INDEX "InstagramFunnelExecution_status_resumeAt_idx"
    ON "InstagramFunnelExecution"("status", "resumeAt");

-- Foreign keys
ALTER TABLE "InstagramFunnel"
    ADD CONSTRAINT "InstagramFunnel_agentConfigId_fkey"
    FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InstagramFunnelBlock"
    ADD CONSTRAINT "InstagramFunnelBlock_funnelId_fkey"
    FOREIGN KEY ("funnelId") REFERENCES "InstagramFunnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InstagramFunnelExecution"
    ADD CONSTRAINT "InstagramFunnelExecution_funnelId_fkey"
    FOREIGN KEY ("funnelId") REFERENCES "InstagramFunnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InstagramCommentFlow"
    ADD CONSTRAINT "InstagramCommentFlow_funnelId_fkey"
    FOREIGN KEY ("funnelId") REFERENCES "InstagramFunnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
