-- DropIndex (uma equipe pode ter vários AgentConfig a partir de agora)
DROP INDEX "AgentConfig_teamId_key";

-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN "segmento" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AgentConfig" ADD COLUMN "subsegmento" TEXT NOT NULL DEFAULT '';

-- Mantém o índice normal (não único) em teamId pra continuar performático nas buscas por equipe
CREATE INDEX "AgentConfig_teamId_idx" ON "AgentConfig"("teamId");
