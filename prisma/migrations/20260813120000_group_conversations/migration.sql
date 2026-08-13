-- AlterTable: conversas de grupo do WhatsApp — aparecem numa aba própria, IA nunca responde
ALTER TABLE "Conversation" ADD COLUMN "isGroup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: quem mandou cada mensagem dentro de um grupo (varia por mensagem)
ALTER TABLE "Message" ADD COLUMN "groupSenderName" TEXT;
