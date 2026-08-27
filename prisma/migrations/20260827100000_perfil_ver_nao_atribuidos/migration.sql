-- AlterTable: perfil de acesso controla se o membro vê atendimentos ainda sem atendente
ALTER TABLE "CrmAccessProfile" ADD COLUMN     "verNaoAtribuidos" BOOLEAN NOT NULL DEFAULT true;
