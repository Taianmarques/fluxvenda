-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "businessModel" TEXT NOT NULL DEFAULT 'B2B',
ADD COLUMN     "subsegment" TEXT NOT NULL DEFAULT '';
