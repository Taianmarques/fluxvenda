-- AlterTable
ALTER TABLE "InfoProduto" ADD COLUMN     "formato" TEXT NOT NULL DEFAULT 'ferramentas';

-- CreateTable
CREATE TABLE "CentralAula" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "moduloId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT,
    "duracaoMin" INTEGER,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "publicada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CentralAula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AulaConcluida" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,

    CONSTRAINT "AulaConcluida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentralComando" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "moduloId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "texto" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "publicada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CentralComando_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CentralAula_moduloId_ordem_idx" ON "CentralAula"("moduloId", "ordem");

-- CreateIndex
CREATE INDEX "AulaConcluida_profileId_idx" ON "AulaConcluida"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "AulaConcluida_profileId_aulaId_key" ON "AulaConcluida"("profileId", "aulaId");

-- CreateIndex
CREATE INDEX "CentralComando_moduloId_ordem_idx" ON "CentralComando"("moduloId", "ordem");

-- AddForeignKey
ALTER TABLE "CentralAula" ADD CONSTRAINT "CentralAula_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "CentralModulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AulaConcluida" ADD CONSTRAINT "AulaConcluida_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "CentralAula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentralComando" ADD CONSTRAINT "CentralComando_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "CentralModulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

