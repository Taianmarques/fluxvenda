-- AlterTable: transferência automática ao pedir foto + vendedor que recebe leads da IA
ALTER TABLE "AgentConfig" ADD COLUMN "transferirAoPedirFoto" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgentConfig" ADD COLUMN "iaLeadAttendantId" TEXT;
