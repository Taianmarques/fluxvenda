-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN     "installmentInterestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "installmentsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interestFreeInstallments" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "maxInstallments" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "asaasInstallmentId" TEXT;
