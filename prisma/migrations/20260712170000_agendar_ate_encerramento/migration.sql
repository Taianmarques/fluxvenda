-- AlterTable: opção de aceitar agendamento que começa dentro do funcionamento
-- mesmo que o atendimento termine depois do horário de fechamento
ALTER TABLE "AgentConfig" ADD COLUMN "agendarAteEncerramento" BOOLEAN NOT NULL DEFAULT false;
