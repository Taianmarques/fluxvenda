-- AlterTable: marca mensagens editadas/apagadas (POST /message/edit e /message/delete na UazAPI)
ALTER TABLE "Message" ADD COLUMN "edited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false;
