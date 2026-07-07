-- AlterTable
ALTER TABLE "Team" ADD COLUMN "aiCreditsBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CreditoCompra" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "stripeSessionId" TEXT NOT NULL,

    CONSTRAINT "CreditoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditoCompra_stripeSessionId_key" ON "CreditoCompra"("stripeSessionId");
CREATE INDEX "CreditoCompra_teamId_createdAt_idx" ON "CreditoCompra"("teamId", "createdAt");

-- AddForeignKey
ALTER TABLE "CreditoCompra" ADD CONSTRAINT "CreditoCompra_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
