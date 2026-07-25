-- CreateTable: tarefas/checklist de uma oportunidade
CREATE TABLE "OpportunityTask" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "assignedToId" TEXT,

    CONSTRAINT "OpportunityTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpportunityTask_opportunityId_idx" ON "OpportunityTask"("opportunityId");

-- AddForeignKey
ALTER TABLE "OpportunityTask" ADD CONSTRAINT "OpportunityTask_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityTask" ADD CONSTRAINT "OpportunityTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
