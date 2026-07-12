-- CreateTable
CREATE TABLE "CrmAccessProfile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "allowedPages" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "CrmAccessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmAccessProfile_teamId_idx" ON "CrmAccessProfile"("teamId");

-- AddForeignKey
ALTER TABLE "CrmAccessProfile" ADD CONSTRAINT "CrmAccessProfile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN "accessProfileId" TEXT;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_accessProfileId_fkey" FOREIGN KEY ("accessProfileId") REFERENCES "CrmAccessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
