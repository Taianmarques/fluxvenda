-- AlterTable: coleta de WhatsApp via DM do Instagram — opcional, desligado por padrão
ALTER TABLE "AgentConfig" ADD COLUMN "igColetaWhatsappEnabled" BOOLEAN NOT NULL DEFAULT false;
