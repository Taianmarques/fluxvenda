-- CreateEnum
CREATE TYPE "Carroceria" AS ENUM ('HATCH', 'SEDA', 'SUV', 'PICAPE', 'MINIVAN', 'COUPE', 'CONVERSIVEL', 'PERUA', 'UTILITARIO');

-- AlterTable: categoria do veículo (SUV, picape, sedã...) pra busca/identificação pela IA
ALTER TABLE "Product" ADD COLUMN "carroceria" "Carroceria";
