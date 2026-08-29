-- AlterTable: throttle do cron de prospecção (1 envio por agente por execução)
ALTER TABLE "AgentConfig" ADD COLUMN "prospeccaoNextSendAt" TIMESTAMP(3);
