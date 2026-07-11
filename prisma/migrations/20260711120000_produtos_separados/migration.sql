-- CreateEnum
CREATE TYPE "SoldProduct" AS ENUM ('CRM', 'PLATAFORMA');

-- AlterTable: produtos contratados por equipe (default com os dois — equipes já
-- existentes não perdem acesso a nada)
ALTER TABLE "Team" ADD COLUMN "productsOwned" "SoldProduct"[] NOT NULL DEFAULT ARRAY['CRM', 'PLATAFORMA']::"SoldProduct"[];

-- AlterTable: produtos contratados individualmente (perfil sem Team) — default Plataforma,
-- que é o que já funcionava pra vendedor/funcionário avulso
ALTER TABLE "Profile" ADD COLUMN "productsOwned" "SoldProduct"[] NOT NULL DEFAULT ARRAY['PLATAFORMA']::"SoldProduct"[];
