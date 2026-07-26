-- AlterTable: follow-up automático por tempo parado na etapa do pipeline
ALTER TABLE "PipelineStage" ADD COLUMN "followupDelaysMinutes" JSONB NOT NULL DEFAULT '[]';

-- AlterTable: contagem do follow-up de etapa por oportunidade (zerada quando a etapa muda)
ALTER TABLE "Opportunity" ADD COLUMN "stageFollowupCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Opportunity" ADD COLUMN "lastStageFollowupAt" TIMESTAMP(3);
