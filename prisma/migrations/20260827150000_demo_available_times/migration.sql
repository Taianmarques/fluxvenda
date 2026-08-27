-- AlterTable: horários fixos configuráveis da demonstração (aba Recursos)
ALTER TABLE "PlatformSettings" ADD COLUMN "demoAvailableTimes" TEXT[] NOT NULL DEFAULT ARRAY['09:00', '11:00', '14:00', '16:00']::TEXT[];
