-- CreateEnum: tipo de catálogo do agente e vocabulários de veículos/imóveis
CREATE TYPE "CatalogType" AS ENUM ('GENERICO', 'VEICULOS', 'IMOVEIS');
CREATE TYPE "Cambio" AS ENUM ('MANUAL', 'AUTOMATICO');
CREATE TYPE "Combustivel" AS ENUM ('FLEX', 'GASOLINA', 'ETANOL', 'DIESEL', 'ELETRICO', 'HIBRIDO', 'GNV');
CREATE TYPE "CondicaoVeiculo" AS ENUM ('NOVO', 'SEMINOVO', 'USADO');
CREATE TYPE "TipoNegocioImovel" AS ENUM ('VENDA', 'ALUGUEL');
CREATE TYPE "TipoImovel" AS ENUM ('CASA', 'APARTAMENTO', 'COMERCIAL', 'TERRENO');

-- AlterTable: tipo de catálogo do agente (default GENERICO preserva o comportamento atual)
ALTER TABLE "AgentConfig" ADD COLUMN "catalogType" "CatalogType" NOT NULL DEFAULT 'GENERICO';

-- AlterTable: atributos de veículos e imóveis no produto — nullable, usados só conforme catalogType
ALTER TABLE "Product" ADD COLUMN "marca" TEXT,
ADD COLUMN "modelo" TEXT,
ADD COLUMN "anoFabricacao" INTEGER,
ADD COLUMN "anoModelo" INTEGER,
ADD COLUMN "km" INTEGER,
ADD COLUMN "cor" TEXT,
ADD COLUMN "cambio" "Cambio",
ADD COLUMN "combustivel" "Combustivel",
ADD COLUMN "placa" TEXT,
ADD COLUMN "condicaoVeiculo" "CondicaoVeiculo",
ADD COLUMN "tipoNegocio" "TipoNegocioImovel",
ADD COLUMN "tipoImovel" "TipoImovel",
ADD COLUMN "areaM2" DOUBLE PRECISION,
ADD COLUMN "quartos" INTEGER,
ADD COLUMN "banheiros" INTEGER,
ADD COLUMN "vagasGaragem" INTEGER,
ADD COLUMN "bairro" TEXT,
ADD COLUMN "cidade" TEXT;
