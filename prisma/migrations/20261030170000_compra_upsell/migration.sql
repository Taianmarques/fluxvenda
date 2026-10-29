-- Upsell de um clique: token do cartão devolvido pelo Asaas na compra original (não é o número do
-- cartão) e os 4 últimos dígitos pra exibir "pagar com o mesmo cartão (final 1234)".
ALTER TABLE "Compra" ADD COLUMN "asaasCardToken" TEXT;
ALTER TABLE "Compra" ADD COLUMN "cartaoFinal" TEXT;
CREATE INDEX "Compra_compraOrigemId_idx" ON "Compra"("compraOrigemId");
