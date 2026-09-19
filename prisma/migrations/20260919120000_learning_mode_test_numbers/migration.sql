-- AlterTable: números liberados pra testar a IA de verdade pelo WhatsApp enquanto o agente
-- ainda está em modo aprendizado (whatsappAiPaused=true) — só esses números recebem resposta
-- automática antes do gestor clicar em "Ativar IA".
ALTER TABLE "AgentConfig" ADD COLUMN "learningModeTestNumbers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
