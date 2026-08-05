-- AlterTable: fluxo de atendimento por gatilhos (lista de pares gatilho/resposta)
ALTER TABLE "AgentConfig" ADD COLUMN "fluxoGatilhos" JSONB NOT NULL DEFAULT '[]';
