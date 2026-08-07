-- AlterTable: editar/apagar mensagem (reflete a ação real no WhatsApp via UazAPI)
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
