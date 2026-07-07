-- AlterTable Team
ALTER TABLE "Team" ADD COLUMN "asaasCustomerId" TEXT;

-- AlterTable CreditoCompra: troca Stripe por Asaas
ALTER TABLE "CreditoCompra" DROP COLUMN "stripeSessionId";
ALTER TABLE "CreditoCompra" ADD COLUMN "formaPagamento" TEXT NOT NULL DEFAULT 'PIX';
ALTER TABLE "CreditoCompra" ADD COLUMN "cpfCnpj" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CreditoCompra" ADD COLUMN "asaasPaymentId" TEXT;
ALTER TABLE "CreditoCompra" ADD COLUMN "asaasInvoiceUrl" TEXT;
ALTER TABLE "CreditoCompra" ADD COLUMN "asaasPixPayload" TEXT;

-- Remove o default temporário de formaPagamento (era só pra preencher linhas existentes)
ALTER TABLE "CreditoCompra" ALTER COLUMN "formaPagamento" DROP DEFAULT;

CREATE UNIQUE INDEX "CreditoCompra_asaasPaymentId_key" ON "CreditoCompra"("asaasPaymentId");
