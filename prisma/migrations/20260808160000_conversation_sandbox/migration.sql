-- AlterTable: conversa de teste do simulador — nunca deve aparecer em relatórios/inbox reais
ALTER TABLE "Conversation" ADD COLUMN "isSandbox" BOOLEAN NOT NULL DEFAULT false;
