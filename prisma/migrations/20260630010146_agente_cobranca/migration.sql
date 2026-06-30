-- CreateEnum
CREATE TYPE "CobrancaStatus" AS ENUM ('PENDENTE', 'BOLETO_GERADO', 'PAGO', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "RecorrenciaCobranca" AS ENUM ('UNICA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'ANUAL');

-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN     "cobrancaEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Cobranca" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentConfigId" TEXT NOT NULL,
    "nomeDevedor" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "CobrancaStatus" NOT NULL DEFAULT 'PENDENTE',
    "recorrencia" "RecorrenciaCobranca" NOT NULL DEFAULT 'UNICA',
    "asaasCustomerId" TEXT,
    "asaasPaymentId" TEXT,
    "boletoUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),

    CONSTRAINT "Cobranca_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
