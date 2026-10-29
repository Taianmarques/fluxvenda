-- Ajustes do resultado gerado: nova versão pedida à IA (ligada à versão de origem) ou edição manual
ALTER TABLE "CentralGeracao" ADD COLUMN "ajusteDeId" TEXT;
ALTER TABLE "CentralGeracao" ADD COLUMN "pedidoAjuste" TEXT;
ALTER TABLE "CentralGeracao" ADD COLUMN "editado" BOOLEAN NOT NULL DEFAULT false;
