-- AlterTable
ALTER TABLE "AgentConfig" ADD COLUMN     "appointmentReminderHours" INTEGER NOT NULL DEFAULT 24;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
