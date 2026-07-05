-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN     "storeLogoBase64" TEXT,
ADD COLUMN     "storeLogoMimeType" TEXT;

-- AlterTable
ALTER TABLE "InstagramFunnelExecution" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "StoreBanner" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentConfigId" TEXT NOT NULL,
    "imagemBase64" TEXT NOT NULL,
    "imagemMimeType" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StoreBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreBanner_agentConfigId_idx" ON "StoreBanner"("agentConfigId");

-- AddForeignKey
ALTER TABLE "StoreBanner" ADD CONSTRAINT "StoreBanner_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
