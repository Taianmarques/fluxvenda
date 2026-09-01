-- Ícone dos serviços na página pública de agendamento, escolhido manualmente pelo gestor —
-- null (default) mantém o comportamento automático por segmento/subsegmento.
ALTER TABLE "AgentConfig" ADD COLUMN "agendamentoIcone" TEXT;
