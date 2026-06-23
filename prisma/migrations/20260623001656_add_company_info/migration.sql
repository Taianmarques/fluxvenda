-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN     "descricaoEmpresa" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "enderecoContato" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "precos" TEXT NOT NULL DEFAULT '';
