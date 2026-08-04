-- AlterTable: login proprio (e-mail/senha) substitui o Clerk nessa instancia.
-- Profile.id passa a ser gerado pelo Prisma Client (cuid()) em vez de vir do Clerk -- isso
-- e' um default do lado do client, nao precisa de alteracao de coluna no banco.
ALTER TABLE "Profile" ADD COLUMN "passwordHash" TEXT;
