-- Modo teste por oferta (conta sandbox do Asaas) e marcação das compras feitas nele
ALTER TABLE "Oferta" ADD COLUMN "sandbox" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Compra" ADD COLUMN "sandbox" BOOLEAN NOT NULL DEFAULT false;
