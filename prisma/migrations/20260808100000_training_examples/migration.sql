-- CreateTable: conversas simuladas (roleplay humano-humano) pra futuro fine-tuning do agente
CREATE TABLE "TrainingExample" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentConfigId" TEXT NOT NULL,
    "createdById" TEXT,
    "cenario" TEXT NOT NULL,
    "turnos" JSONB NOT NULL,

    CONSTRAINT "TrainingExample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrainingExample_agentConfigId_idx" ON "TrainingExample"("agentConfigId");

ALTER TABLE "TrainingExample" ADD CONSTRAINT "TrainingExample_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingExample" ADD CONSTRAINT "TrainingExample_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
