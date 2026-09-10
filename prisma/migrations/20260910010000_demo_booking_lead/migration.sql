-- DemoBooking passa a aceitar agendamento de lead sem conta ainda (teamId/requestedById nulos,
-- usa leadName/leadPhone nesse caso).

-- AlterTable
ALTER TABLE "DemoBooking" ALTER COLUMN "teamId" DROP NOT NULL;
ALTER TABLE "DemoBooking" ALTER COLUMN "requestedById" DROP NOT NULL;
ALTER TABLE "DemoBooking" ADD COLUMN "leadName" TEXT;
ALTER TABLE "DemoBooking" ADD COLUMN "leadPhone" TEXT;
