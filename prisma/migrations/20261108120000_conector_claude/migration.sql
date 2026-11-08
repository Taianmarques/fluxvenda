-- Conector do Claude: OAuth (clientes, códigos, tokens) e biblioteca de mídia do superadmin
CREATE TABLE "McpClient" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nome" TEXT NOT NULL DEFAULT 'Claude',
    "redirectUris" TEXT[],
    CONSTRAINT "McpClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "McpAuthCode" (
    "codeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    CONSTRAINT "McpAuthCode_pkey" PRIMARY KEY ("codeHash")
);

CREATE TABLE "McpToken" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "accessHash" TEXT NOT NULL,
    "accessExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "McpToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BibliotecaMidia" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "arquivo" TEXT NOT NULL,
    CONSTRAINT "BibliotecaMidia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "McpToken_accessHash_key" ON "McpToken"("accessHash");
CREATE UNIQUE INDEX "McpToken_refreshHash_key" ON "McpToken"("refreshHash");
CREATE INDEX "McpToken_profileId_idx" ON "McpToken"("profileId");
CREATE INDEX "BibliotecaMidia_createdAt_idx" ON "BibliotecaMidia"("createdAt");

ALTER TABLE "McpToken" ADD CONSTRAINT "McpToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "McpClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "McpToken" ADD CONSTRAINT "McpToken_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
