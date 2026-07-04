CREATE TABLE "InstagramConnection" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "agentConfigId" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "pageAccessToken" TEXT NOT NULL,
  "instagramBusinessAccountId" TEXT NOT NULL,
  "instagramUsername" TEXT NOT NULL DEFAULT '',
  "tokenExpiresAt" TIMESTAMP(3),
  "webhookSubscribed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "InstagramConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstagramConnection_agentConfigId_key" ON "InstagramConnection"("agentConfigId");
CREATE UNIQUE INDEX "InstagramConnection_instagramBusinessAccountId_key" ON "InstagramConnection"("instagramBusinessAccountId");

ALTER TABLE "InstagramConnection" ADD CONSTRAINT "InstagramConnection_agentConfigId_fkey"
  FOREIGN KEY ("agentConfigId") REFERENCES "AgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OAuthState" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "state" TEXT NOT NULL,
  "agentConfigId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthState_state_key" ON "OAuthState"("state");
