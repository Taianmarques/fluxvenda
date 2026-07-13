-- Reply/encaminhar estilo WhatsApp: id do provedor + citação + flag de encaminhada
ALTER TABLE "Message" ADD COLUMN "waMessageId" TEXT;
ALTER TABLE "Message" ADD COLUMN "forwarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT;

-- AddForeignKey (auto-relação; SET NULL pra não quebrar o cascade de Conversation)
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- CreateIndex (resolução de citação inbound: conversationId + waMessageId)
CREATE INDEX "Message_conversationId_waMessageId_idx" ON "Message"("conversationId", "waMessageId");
