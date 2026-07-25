-- AlterTable: marca quando uma oportunidade foi perdida (espelha wonAt)
ALTER TABLE "Opportunity" ADD COLUMN "lostAt" TIMESTAMP(3);
