-- AlterTable: instruções adicionais em texto livre, anexadas ao final do systemPrompt gerado pelo wizard
ALTER TABLE "AgentConfig" ADD COLUMN     "instrucoesExtras" TEXT NOT NULL DEFAULT '';
