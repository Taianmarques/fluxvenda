-- AlterTable: instruções livres de como/quando pedir o WhatsApp na coleta via Instagram
ALTER TABLE "AgentConfig" ADD COLUMN "igColetaWhatsappInstrucoes" TEXT NOT NULL DEFAULT '';
