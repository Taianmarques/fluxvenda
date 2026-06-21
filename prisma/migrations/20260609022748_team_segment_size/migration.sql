/*
  Warnings:

  - Made the column `invite` on table `Team` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "segment" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "size" TEXT NOT NULL DEFAULT '1-10',
ALTER COLUMN "invite" SET NOT NULL;
