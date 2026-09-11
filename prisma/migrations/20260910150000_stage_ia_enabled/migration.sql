-- Liga/desliga a IA por etapa do pipeline (default true = comportamento atual, sem mudança)
ALTER TABLE "PipelineStage" ADD COLUMN "iaEnabled" BOOLEAN NOT NULL DEFAULT true;
