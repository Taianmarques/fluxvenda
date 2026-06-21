CREATE TABLE "NinetyDayPlan" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "NinetyDayPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NinetyDayPlan_diagnosticId_key" ON "NinetyDayPlan"("diagnosticId");

ALTER TABLE "NinetyDayPlan" ADD CONSTRAINT "NinetyDayPlan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
