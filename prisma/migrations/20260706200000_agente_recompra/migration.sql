-- Recompra vira agente próprio: preserva o comportamento atual (só fica ligada
-- em quem tinha o agente de carteira ativo) e passa o default para false
UPDATE "AgentConfig" SET "recompraEnabled" = ("carteiraEnabled" AND "recompraEnabled");
ALTER TABLE "AgentConfig" ALTER COLUMN "recompraEnabled" SET DEFAULT false;
