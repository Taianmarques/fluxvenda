-- AlterTable: lista de quem pode ver cada grupo do WhatsApp (vazio = todo mundo vê)
ALTER TABLE "Conversation" ADD COLUMN "groupVisibleToIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
