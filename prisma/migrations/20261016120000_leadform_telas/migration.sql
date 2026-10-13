-- Quiz em telas: estilo da pagina publica e sequencia de etapas
ALTER TABLE "LeadForm" ADD COLUMN "style" TEXT NOT NULL DEFAULT 'CHAT';
ALTER TABLE "LeadForm" ADD COLUMN "steps" JSONB;
