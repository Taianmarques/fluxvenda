-- Remove campo substituído pelos fluxos condicionais
ALTER TABLE "AgentConfig" DROP COLUMN IF EXISTS "igCommentKeywords";

-- Cria a tabela de fluxos condicionais de comentários → DM
CREATE TABLE "InstagramCommentFlow" (
    "id"            TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentConfigId" TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "keywords"      TEXT[] NOT NULL DEFAULT '{}',
    "replyMessage"  TEXT NOT NULL,
    "order"         INTEGER NOT NULL DEFAULT 0,
    "active"        BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InstagramCommentFlow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InstagramCommentFlow_agentConfigId_order_idx" ON "InstagramCommentFlow"("agentConfigId", "order");

ALTER TABLE "InstagramCommentFlow"
    ADD CONSTRAINT "InstagramCommentFlow_agentConfigId_fkey"
    FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
