-- AlterTable: campos extras personalizáveis do agendamento pela página pública
-- [{ label, obrigatorio }] — nome e WhatsApp continuam sempre sendo pedidos
ALTER TABLE "AgentConfig" ADD COLUMN "bookingFormFields" JSONB NOT NULL DEFAULT '[]';
