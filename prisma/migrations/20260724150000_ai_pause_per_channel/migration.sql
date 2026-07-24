-- AlterTable: pausa só a resposta automática da IA por canal, independente do "active" (canal conectado)
ALTER TABLE "AgentConfig" ADD COLUMN "whatsappAiPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgentConfig" ADD COLUMN "instagramAiPaused" BOOLEAN NOT NULL DEFAULT false;
