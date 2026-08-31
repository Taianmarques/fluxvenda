-- Janela de horário (hora local) em que follow-up, prospecção e campanha podem disparar
-- mensagens automáticas — evita chegar fora do horário comercial ou de madrugada. Default
-- 08:00-20:00 pros agentes já existentes.
ALTER TABLE "AgentConfig" ADD COLUMN "horarioEnvioInicio" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "AgentConfig" ADD COLUMN "horarioEnvioFim" TEXT NOT NULL DEFAULT '20:00';
