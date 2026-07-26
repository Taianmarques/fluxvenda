-- AlterTable: investimento mensal em marketing/vendas, usado pro calculo de CAC
ALTER TABLE "AgentConfig" ADD COLUMN "investimentoMensal" DOUBLE PRECISION NOT NULL DEFAULT 0;
