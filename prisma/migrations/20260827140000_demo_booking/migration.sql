-- CreateTable: agendamento de demonstração do CRM (plataforma, aba "Recursos" da página de início)
CREATE TABLE "DemoBooking" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 40,
    "status" TEXT NOT NULL DEFAULT 'AGENDADO',

    CONSTRAINT "DemoBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoBooking_teamId_idx" ON "DemoBooking"("teamId");

-- CreateIndex
CREATE INDEX "DemoBooking_scheduledAt_idx" ON "DemoBooking"("scheduledAt");

-- AddForeignKey
ALTER TABLE "DemoBooking" ADD CONSTRAINT "DemoBooking_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoBooking" ADD CONSTRAINT "DemoBooking_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
