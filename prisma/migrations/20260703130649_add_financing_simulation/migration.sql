-- CreateEnum
CREATE TYPE "FinancingStatus" AS ENUM ('SIMULADO', 'INTERESSE', 'ENCAMINHADO', 'DESCARTADO');

-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN     "bvClientId" TEXT,
ADD COLUMN     "bvClientSecret" TEXT,
ADD COLUMN     "bvSandbox" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "financingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FinancingSimulation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentConfigId" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "nomeCliente" TEXT NOT NULL DEFAULT '',
    "cpf" TEXT NOT NULL DEFAULT '',
    "dataNascimento" TEXT NOT NULL DEFAULT '',
    "possuiHabilitacao" BOOLEAN NOT NULL DEFAULT false,
    "valorVeiculo" DOUBLE PRECISION NOT NULL,
    "valorEntrada" DOUBLE PRECISION NOT NULL,
    "prazoMeses" INTEGER NOT NULL,
    "resultadoJson" TEXT NOT NULL,
    "valorParcela" DOUBLE PRECISION,
    "taxaMensal" DOUBLE PRECISION,
    "cet" DOUBLE PRECISION,
    "valorTotal" DOUBLE PRECISION,
    "status" "FinancingStatus" NOT NULL DEFAULT 'SIMULADO',
    "notas" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FinancingSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancingSimulation_agentConfigId_contactNumber_idx" ON "FinancingSimulation"("agentConfigId", "contactNumber");

-- AddForeignKey
ALTER TABLE "FinancingSimulation" ADD CONSTRAINT "FinancingSimulation_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
