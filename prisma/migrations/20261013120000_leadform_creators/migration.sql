-- Formulários de captação para criadores de conteúdo: aparência, botão final, plano B no
-- WhatsApp, consentimento, organização no CRM, origem do lead e funil de visitas.
ALTER TABLE "LeadForm" ADD COLUMN "accentColor" TEXT;
ALTER TABLE "LeadForm" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "LeadForm" ADD COLUMN "ctaLabel" TEXT;
ALTER TABLE "LeadForm" ADD COLUMN "ctaUrl" TEXT;
ALTER TABLE "LeadForm" ADD COLUMN "waNumber" TEXT;
ALTER TABLE "LeadForm" ADD COLUMN "waButtonText" TEXT;
ALTER TABLE "LeadForm" ADD COLUMN "consentText" TEXT;
ALTER TABLE "LeadForm" ADD COLUMN "etiquetaId" TEXT;
ALTER TABLE "LeadForm" ADD COLUMN "pipelineStageId" TEXT;

ALTER TABLE "LeadFormSubmission" ADD COLUMN "utm" JSONB;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "consentAt" TIMESTAMP(3);
ALTER TABLE "LeadFormSubmission" ADD COLUMN "inviteError" TEXT;

-- CreateTable
CREATE TABLE "LeadFormView" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadFormView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadFormView_formId_createdAt_idx" ON "LeadFormView"("formId", "createdAt");

-- AddForeignKey
ALTER TABLE "LeadFormView" ADD CONSTRAINT "LeadFormView_formId_fkey" FOREIGN KEY ("formId") REFERENCES "LeadForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
