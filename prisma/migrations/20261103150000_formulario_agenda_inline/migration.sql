-- Agendamento ao final do formulário/quiz no estilo agenda de demonstração (calendário na própria tela)
ALTER TABLE "LeadForm" DROP COLUMN "bookingLabel";
ALTER TABLE "LeadForm" ADD COLUMN "bookingConfig" JSONB;
ALTER TABLE "LeadFormSubmission" ADD COLUMN "appointmentId" TEXT;
