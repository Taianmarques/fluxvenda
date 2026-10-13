-- Checkout dentro do quiz em telas (pagamento via Asaas do agente)
ALTER TABLE "LeadFormSubmission" ADD COLUMN "payStatus" TEXT;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "payMethod" TEXT;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "payValueCents" INTEGER;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "payInstallments" INTEGER;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "payAsaasId" TEXT;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "payInstallmentId" TEXT;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "payPixPayload" TEXT;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "payCpf" TEXT;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "payEmail" TEXT;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "payAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "paidAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "LeadFormSubmission_payAsaasId_idx" ON "LeadFormSubmission"("payAsaasId");