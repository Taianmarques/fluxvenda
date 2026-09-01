-- AlterTable: números de WhatsApp cadastrados pra testar o agente direto no celular
ALTER TABLE "AgentConfig" ADD COLUMN "testPhoneNumbers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable: conversa de um número cadastrado em testPhoneNumbers — visível no chat com
-- etiqueta própria, fora de relatórios/métricas reais
ALTER TABLE "Conversation" ADD COLUMN "isTestNumber" BOOLEAN NOT NULL DEFAULT false;
