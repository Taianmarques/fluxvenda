-- AlterTable: metas de vendas mensais (geral e por vendedor)
ALTER TABLE "AgentConfig" ADD COLUMN "metaGeralMensal" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AgentConfig" ADD COLUMN "metasPorVendedor" JSONB NOT NULL DEFAULT '{}';
