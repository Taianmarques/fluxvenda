-- CreateEnum
CREATE TYPE "WhatsappProvider" AS ENUM ('UAZAPI', 'CLOUD_API');

-- CreateEnum
CREATE TYPE "CampanhaOrigemMensagem" AS ENUM ('TEXTO_LIVRE', 'TEMPLATE_META');

-- AlterTable: WhatsApp Cloud API (Meta oficial) no AgentConfig
ALTER TABLE "AgentConfig"
  ADD COLUMN "whatsappProvider"      "WhatsappProvider" NOT NULL DEFAULT 'UAZAPI',
  ADD COLUMN "cloudApiPhoneNumberId" TEXT,
  ADD COLUMN "cloudApiWabaId"        TEXT,
  ADD COLUMN "cloudApiAccessToken"   TEXT,
  ADD COLUMN "cloudApiVerifyToken"   TEXT,
  ADD COLUMN "cloudApiPhoneNumber"   TEXT,
  ADD COLUMN "cloudApiVerifiedName"  TEXT;

-- AlterTable: campanhas via template aprovado da Meta
ALTER TABLE "Campanha"
  ADD COLUMN "origemMensagem"    "CampanhaOrigemMensagem" NOT NULL DEFAULT 'TEXTO_LIVRE',
  ADD COLUMN "templateName"      TEXT,
  ADD COLUMN "templateLanguage"  TEXT,
  ADD COLUMN "templateVariaveis" TEXT;
