-- Conta de exemplo criada pelo super admin, com pipeline e conversas simuladas por segmento —
-- excluída das métricas reais e dos crons de trial/lead quente.
ALTER TABLE "Team" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
