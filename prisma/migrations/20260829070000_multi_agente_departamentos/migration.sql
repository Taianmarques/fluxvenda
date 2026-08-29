-- Modo multi-agente por setor: cada Departamento pode ter sua própria persona de IA
-- (agenteInstrucoes), e um AgentConfig pode ligar esse modo (multiAgenteDepartamentos) pra
-- que a própria IA troque de setor sozinha em vez de sempre passar pra um humano. Ambos
-- default vazio/false — não muda nada pros agentes já existentes.
ALTER TABLE "Departamento" ADD COLUMN "agenteInstrucoes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AgentConfig" ADD COLUMN "multiAgenteDepartamentos" BOOLEAN NOT NULL DEFAULT false;
