-- AlterTable
ALTER TABLE "Message" ADD COLUMN "senderId" TEXT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
