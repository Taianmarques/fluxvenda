-- AlterTable: número de atendimentos simultâneos quando não há profissionais
-- (ex: lava-jato com 3 vagas atende 3 clientes no mesmo horário)
ALTER TABLE "AgentConfig" ADD COLUMN "vagasSimultaneas" INTEGER NOT NULL DEFAULT 1;
