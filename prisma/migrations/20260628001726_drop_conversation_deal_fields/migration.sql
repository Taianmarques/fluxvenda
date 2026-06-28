-- Campos de negociação migrados para a tabela "Opportunity" (backfill já aplicado)
ALTER TABLE "Conversation" DROP COLUMN "stageId";
ALTER TABLE "Conversation" DROP COLUMN "dealValue";
ALTER TABLE "Conversation" DROP COLUMN "wonAt";
