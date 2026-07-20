-- Sinal via Pix (Asaas) pra confirmar agendamento pela página pública.
-- ADD VALUE em transação é ok no PG >= 12 desde que o valor novo não seja usado na mesma transação.
ALTER TYPE "AppointmentStatus" ADD VALUE 'AGUARDANDO_PAGAMENTO';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "asaasPaymentId" TEXT,
ADD COLUMN "asaasPixPayload" TEXT,
ADD COLUMN "asaasInvoiceUrl" TEXT;

-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN "agendamentoCobrancaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "agendamentoSinalValor" DOUBLE PRECISION NOT NULL DEFAULT 0;
