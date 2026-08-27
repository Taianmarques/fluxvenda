-- AlterTable
ALTER TABLE "Team" ADD COLUMN "crmPlanTier" TEXT;

-- CreateTable
CREATE TABLE "PlanPurchase" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "formaPagamento" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL DEFAULT '',
    "asaasPaymentId" TEXT,
    "asaasInvoiceUrl" TEXT,
    "asaasPixPayload" TEXT,

    CONSTRAINT "PlanPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanPurchase_asaasPaymentId_key" ON "PlanPurchase"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "PlanPurchase_teamId_createdAt_idx" ON "PlanPurchase"("teamId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlanPurchase" ADD CONSTRAINT "PlanPurchase_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
