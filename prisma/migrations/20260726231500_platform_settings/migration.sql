-- CreateTable: configuração global de marca da plataforma (logo do menu do CRM +
-- ícone do PWA) — singleton (id fixo "singleton"), só o ADMIN edita via /admin/branding
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByEmail" TEXT,
    "menuLogoBase64" TEXT,
    "menuLogoMimeType" TEXT,
    "pwaIcon192Base64" TEXT,
    "pwaIcon192MimeType" TEXT,
    "pwaIcon512Base64" TEXT,
    "pwaIcon512MimeType" TEXT,
    "pwaIcon512MaskableBase64" TEXT,
    "pwaIcon512MaskableMimeType" TEXT,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);
