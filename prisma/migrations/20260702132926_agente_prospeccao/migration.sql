-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NOVO', 'ABORDADO', 'RESPONDEU', 'QUALIFICADO', 'REUNIAO_AGENDADA', 'DESCARTADO', 'ENCERRADO');

-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN     "prospeccaoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prospeccaoFollowupDias" JSONB NOT NULL DEFAULT '[3,7,14]',
ADD COLUMN     "prospeccaoMensagemInicial" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "prospeccaoRegiao" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "prospeccaoSegmento" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentConfigId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresa" TEXT NOT NULL DEFAULT '',
    "telefone" TEXT NOT NULL,
    "segmento" TEXT NOT NULL DEFAULT '',
    "regiao" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "status" "ProspectStatus" NOT NULL DEFAULT 'NOVO',
    "notas" TEXT NOT NULL DEFAULT '',
    "abordagemCount" INTEGER NOT NULL DEFAULT 0,
    "lastAbordagemAt" TIMESTAMP(3),

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_agentConfigId_telefone_key" ON "Prospect"("agentConfigId", "telefone");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
