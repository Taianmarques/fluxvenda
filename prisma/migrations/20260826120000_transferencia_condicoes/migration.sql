-- AlterTable: condições em texto livre pra transferência automática da IA pra humano
ALTER TABLE "AgentConfig" ADD COLUMN     "transferenciaCondicoes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
