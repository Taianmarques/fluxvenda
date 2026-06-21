CREATE TABLE "PlanAction" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "phase" INTEGER NOT NULL DEFAULT 1,
    "text" TEXT NOT NULL,
    "impact" INTEGER NOT NULL DEFAULT 5,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanAction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlanAction" ADD CONSTRAINT "PlanAction_planId_fkey" FOREIGN KEY ("planId") REFERENCES "NinetyDayPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
