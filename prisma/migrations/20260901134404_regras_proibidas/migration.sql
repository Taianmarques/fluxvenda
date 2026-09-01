-- AlterTable: regras em texto livre sobre o que a IA nunca deve fazer, cadastradas pelo gestor
ALTER TABLE "AgentConfig" ADD COLUMN "regrasProibidas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
