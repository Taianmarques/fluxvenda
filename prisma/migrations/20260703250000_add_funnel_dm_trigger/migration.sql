ALTER TABLE "InstagramFunnel"
  ADD COLUMN "dmTriggerEnabled"  BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN "dmTriggerKeywords" TEXT[]   NOT NULL DEFAULT '{}';
