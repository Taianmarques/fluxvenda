-- CreateTable: arquivos internos anexados a uma oportunidade (nunca enviados ao cliente)
CREATE TABLE "OpportunityFile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opportunityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "base64" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "OpportunityFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpportunityFile_opportunityId_idx" ON "OpportunityFile"("opportunityId");

-- AddForeignKey
ALTER TABLE "OpportunityFile" ADD CONSTRAINT "OpportunityFile_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityFile" ADD CONSTRAINT "OpportunityFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
