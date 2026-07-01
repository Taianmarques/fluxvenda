-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN     "atendimentoEspecialDescricao" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "atendimentoEspecialEnabled" BOOLEAN NOT NULL DEFAULT false;
