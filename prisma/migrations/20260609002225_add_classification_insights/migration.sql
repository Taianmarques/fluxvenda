-- AlterTable
ALTER TABLE "DiagnosticResult" ADD COLUMN     "classification" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "insights" TEXT NOT NULL DEFAULT '{}';
