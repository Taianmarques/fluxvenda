-- AlterTable: ciclo de cobrança (mensal/semestral/anual) do plano comprado
ALTER TABLE "PlanPurchase" ADD COLUMN "cycle" TEXT NOT NULL DEFAULT 'MENSAL';
