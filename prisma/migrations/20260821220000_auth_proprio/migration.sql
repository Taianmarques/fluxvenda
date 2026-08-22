-- AlterTable: campos de login/senha próprios (substitui o Clerk) — todos nullable
-- pra não quebrar os Profile existentes, que migram via fluxo de "esqueci minha senha"
ALTER TABLE "Profile" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Profile" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN "emailVerifyToken" TEXT;
ALTER TABLE "Profile" ADD COLUMN "emailVerifyExpiresAt" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "Profile" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_emailVerifyToken_key" ON "Profile"("emailVerifyToken");
CREATE UNIQUE INDEX "Profile_passwordResetToken_key" ON "Profile"("passwordResetToken");
