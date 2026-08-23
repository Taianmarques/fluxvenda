-- AlterTable: membro pode virar co-gestor (mesmo nível de acesso do dono da equipe no CRM)
ALTER TABLE "TeamMember" ADD COLUMN "coManager" BOOLEAN NOT NULL DEFAULT false;
