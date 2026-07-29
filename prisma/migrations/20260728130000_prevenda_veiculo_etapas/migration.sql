-- AlterTable: cada etapa de coleta da pré-venda de veículos liga/desliga independente
ALTER TABLE "AgentConfig" ADD COLUMN "prevendaEtapaVeiculoEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AgentConfig" ADD COLUMN "prevendaEtapaQualificacaoEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AgentConfig" ADD COLUMN "prevendaEtapaDocumentosEnabled" BOOLEAN NOT NULL DEFAULT true;
