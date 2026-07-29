-- AlterTable: pré-vendas de veículos (SDR) — opcional, restrições em texto livre
ALTER TABLE "AgentConfig" ADD COLUMN "prevendaVeiculoEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgentConfig" ADD COLUMN "prevendaVeiculoRestricoes" TEXT NOT NULL DEFAULT '';
