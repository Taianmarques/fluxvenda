-- AlterTable: SDR de qualificação (materiais/marcenaria) via ferramentas estruturadas
ALTER TABLE "AgentConfig" ADD COLUMN "sdrMateriaisEnabled" BOOLEAN NOT NULL DEFAULT false;
