-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "pendingProfessionalId" TEXT,
ADD COLUMN     "pendingServiceId" TEXT;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_pendingProfessionalId_fkey" FOREIGN KEY ("pendingProfessionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_pendingServiceId_fkey" FOREIGN KEY ("pendingServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
