-- Pagina de conversao em site externo (redirecionamento + evento do pixel)
ALTER TABLE "LeadForm" ADD COLUMN "conversionUrl" TEXT;
ALTER TABLE "LeadForm" ADD COLUMN "conversionEvent" TEXT;
