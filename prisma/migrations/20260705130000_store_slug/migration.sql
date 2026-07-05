-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN "storeSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AgentConfig_storeSlug_key" ON "AgentConfig"("storeSlug");
