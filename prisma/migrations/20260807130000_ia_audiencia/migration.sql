-- AlterTable: quem a IA atende quando está ligada (critérios opcionais de exclusão)
ALTER TABLE "AgentConfig" ADD COLUMN "iaIgnoraAtribuidos" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgentConfig" ADD COLUMN "iaNiveisCarteiraExcluidos" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "AgentConfig" ADD COLUMN "iaNumerosBloqueados" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "AgentConfig" ADD COLUMN "iaPerfisExcluidos" JSONB NOT NULL DEFAULT '[]';
