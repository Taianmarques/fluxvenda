-- CreateTable
CREATE TABLE "Departamento" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Departamento_teamId_idx" ON "Departamento"("teamId");

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN "departamentoId" TEXT;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Conversation" ADD COLUMN "departamentoId" TEXT;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
