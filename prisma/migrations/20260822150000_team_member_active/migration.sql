-- AlterTable: inativar membro sem excluir da equipe (ver app/api/equipe/membros/[memberId]/route.ts)
ALTER TABLE "TeamMember" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
