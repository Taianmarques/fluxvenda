-- Formulário/quiz: botão de agendamento na tela final (agenda online do agente)
ALTER TABLE "LeadForm" ADD COLUMN "bookingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LeadForm" ADD COLUMN "bookingLabel" TEXT;
