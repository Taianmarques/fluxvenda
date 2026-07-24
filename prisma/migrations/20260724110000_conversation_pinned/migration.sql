-- AlterTable: fixa conversa no topo da lista
ALTER TABLE "Conversation" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
