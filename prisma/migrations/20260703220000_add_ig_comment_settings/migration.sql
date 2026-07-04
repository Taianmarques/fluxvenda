ALTER TABLE "AgentConfig" ADD COLUMN "igCommentAutoDm" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgentConfig" ADD COLUMN "igCommentKeywords" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "AgentConfig" ADD COLUMN "igCommentDmMessage" TEXT;
