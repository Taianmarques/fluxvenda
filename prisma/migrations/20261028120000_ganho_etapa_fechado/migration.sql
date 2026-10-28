-- Negócios arrastados pra etapa de fechamento antes de "Fechado" contar como ganho:
-- marca como ganhos na data em que entraram na etapa (perdidos ficam como estão)
UPDATE "Opportunity" o
SET "wonAt" = COALESCE(o."stageEnteredAt", o."updatedAt")
FROM "PipelineStage" s
WHERE s."id" = o."stageId"
  AND o."wonAt" IS NULL
  AND o."lostAt" IS NULL
  AND lower(trim(s."name")) IN ('fechado', 'fechada', 'ganho', 'ganha', 'vendido', 'venda fechada', 'negócio fechado', 'negocio fechado', 'negócio ganho', 'negocio ganho');
