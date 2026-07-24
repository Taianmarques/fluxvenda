-- AlterTable: guarda o número de WhatsApp detectado numa conversa do Instagram, trava
-- reprocessamento do gatilho automático de contato
ALTER TABLE "Conversation" ADD COLUMN "extractedWhatsappNumber" TEXT;
