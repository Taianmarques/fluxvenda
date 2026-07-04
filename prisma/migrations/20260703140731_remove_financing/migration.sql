-- Drop FinancingSimulation table
DROP TABLE IF EXISTS "FinancingSimulation";

-- Drop FinancingStatus enum
DROP TYPE IF EXISTS "FinancingStatus";

-- Drop financing columns from AgentConfig
ALTER TABLE "AgentConfig" DROP COLUMN IF EXISTS "financingEnabled";
ALTER TABLE "AgentConfig" DROP COLUMN IF EXISTS "bvClientId";
ALTER TABLE "AgentConfig" DROP COLUMN IF EXISTS "bvClientSecret";
ALTER TABLE "AgentConfig" DROP COLUMN IF EXISTS "bvSandbox";
ALTER TABLE "AgentConfig" DROP COLUMN IF EXISTS "bvCommercialPartnerCode";
