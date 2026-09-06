-- O que a IA precisa confirmar com o cliente antes de transferir a conversa pra um
-- departamento (ex: SDR exigindo orçamento/prazo antes de passar pra vendas).
ALTER TABLE "Departamento" ADD COLUMN "criteriosQualificacao" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
