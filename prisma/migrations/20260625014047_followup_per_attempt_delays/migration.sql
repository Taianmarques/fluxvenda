-- Adiciona a coluna nova com um default temporário
ALTER TABLE "AgentConfig" ADD COLUMN "followupDelaysMinutes" JSONB NOT NULL DEFAULT '[1440]';

-- Preserva a configuração existente: replica o valor em horas (convertido pra minutos)
-- uma vez para cada tentativa que a empresa já tinha configurado.
UPDATE "AgentConfig"
SET "followupDelaysMinutes" = to_jsonb(
  array_fill(("followupDelayHours" * 60)::int, ARRAY[GREATEST("followupMaxAttempts", 1)])
)
WHERE "followupDelayHours" IS NOT NULL;

ALTER TABLE "AgentConfig" DROP COLUMN "followupDelayHours";
ALTER TABLE "AgentConfig" DROP COLUMN "followupMaxAttempts";
