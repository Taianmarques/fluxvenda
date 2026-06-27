-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cria um pipeline "Pipeline Principal" para cada empresa que já tinha etapas, preservando
-- a configuração existente em vez de resetar pra um estado vazio.
INSERT INTO "Pipeline" ("id", "agentConfigId", "name", "order")
SELECT gen_random_uuid()::text, "agentConfigId", 'Pipeline Principal', 0
FROM (SELECT DISTINCT "agentConfigId" FROM "PipelineStage") AS distinct_configs;

-- AlterTable: liga as etapas existentes ao pipeline recém-criado da mesma empresa
ALTER TABLE "PipelineStage" ADD COLUMN "pipelineId" TEXT;

UPDATE "PipelineStage"
SET "pipelineId" = (
  SELECT "Pipeline"."id" FROM "Pipeline"
  WHERE "Pipeline"."agentConfigId" = "PipelineStage"."agentConfigId"
  LIMIT 1
);

ALTER TABLE "PipelineStage" ALTER COLUMN "pipelineId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "PipelineStage" DROP CONSTRAINT "PipelineStage_agentConfigId_fkey";

ALTER TABLE "PipelineStage" DROP COLUMN "agentConfigId";

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
