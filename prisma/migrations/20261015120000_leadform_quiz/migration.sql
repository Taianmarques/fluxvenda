-- Quiz de perfil nos formularios: resultados no formulario e resultado de cada lead
ALTER TABLE "LeadForm" ADD COLUMN "quizResults" JSONB;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "quizResult" TEXT;
