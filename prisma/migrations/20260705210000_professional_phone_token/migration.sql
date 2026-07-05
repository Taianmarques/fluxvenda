-- AlterTable
ALTER TABLE "Professional" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Professional" ADD COLUMN "accessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Professional_accessToken_key" ON "Professional"("accessToken");
