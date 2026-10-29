-- Central de Ferramentas Comerciais: módulos, ferramentas (prompt/campos editáveis no admin),
-- favoritos, histórico de gerações e perfil da empresa.

-- CreateTable
CREATE TABLE "CentralModulo" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "icone" TEXT NOT NULL DEFAULT 'folder',

    CONSTRAINT "CentralModulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentralFerramenta" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "moduloId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "objetivo" TEXT NOT NULL DEFAULT '',
    "campos" JSONB NOT NULL DEFAULT '[]',
    "prompt" TEXT NOT NULL,
    "instrucoes" TEXT NOT NULL DEFAULT '',
    "icone" TEXT NOT NULL DEFAULT 'sparkles',
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "permitirCopiarPrompt" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CentralFerramenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentralFavorito" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" TEXT NOT NULL,
    "ferramentaId" TEXT NOT NULL,

    CONSTRAINT "CentralFavorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentralGeracao" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" TEXT NOT NULL,
    "teamId" TEXT,
    "ferramentaId" TEXT NOT NULL,
    "entradas" JSONB NOT NULL,
    "resultado" TEXT NOT NULL,
    "salvo" BOOLEAN NOT NULL DEFAULT false,
    "titulo" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CentralGeracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilEmpresa" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT,
    "profileId" TEXT,
    "nomeEmpresa" TEXT NOT NULL DEFAULT '',
    "segmento" TEXT NOT NULL DEFAULT '',
    "produtos" TEXT NOT NULL DEFAULT '',
    "publico" TEXT NOT NULL DEFAULT '',
    "ticketMedio" TEXT NOT NULL DEFAULT '',
    "diferenciais" TEXT NOT NULL DEFAULT '',
    "regiao" TEXT NOT NULL DEFAULT '',
    "canais" TEXT NOT NULL DEFAULT '',
    "tomDeVoz" TEXT NOT NULL DEFAULT '',
    "concorrentes" TEXT NOT NULL DEFAULT '',
    "observacoes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PerfilEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CentralModulo_numero_key" ON "CentralModulo"("numero");
CREATE UNIQUE INDEX "CentralFerramenta_slug_key" ON "CentralFerramenta"("slug");
CREATE INDEX "CentralFerramenta_moduloId_ordem_idx" ON "CentralFerramenta"("moduloId", "ordem");
CREATE UNIQUE INDEX "CentralFavorito_profileId_ferramentaId_key" ON "CentralFavorito"("profileId", "ferramentaId");
CREATE INDEX "CentralGeracao_profileId_createdAt_idx" ON "CentralGeracao"("profileId", "createdAt");
CREATE INDEX "CentralGeracao_profileId_ferramentaId_createdAt_idx" ON "CentralGeracao"("profileId", "ferramentaId", "createdAt");
CREATE UNIQUE INDEX "PerfilEmpresa_teamId_key" ON "PerfilEmpresa"("teamId");
CREATE UNIQUE INDEX "PerfilEmpresa_profileId_key" ON "PerfilEmpresa"("profileId");

-- AddForeignKey
ALTER TABLE "CentralFerramenta" ADD CONSTRAINT "CentralFerramenta_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "CentralModulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CentralFavorito" ADD CONSTRAINT "CentralFavorito_ferramentaId_fkey" FOREIGN KEY ("ferramentaId") REFERENCES "CentralFerramenta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CentralGeracao" ADD CONSTRAINT "CentralGeracao_ferramentaId_fkey" FOREIGN KEY ("ferramentaId") REFERENCES "CentralFerramenta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Os 10 módulos da Central
INSERT INTO "CentralModulo" ("id", "numero", "nome", "descricao", "icone") VALUES
  ('conheca-seu-cliente', 1, 'Conheça seu cliente', 'Entenda quem compra, por que compra e o que trava a decisão.', 'users'),
  ('criacao-de-ofertas', 2, 'Criação de ofertas', 'Monte ofertas irresistíveis, com preço, bônus e garantia.', 'gift'),
  ('anuncios-e-aquisicao', 3, 'Anúncios e aquisição', 'Anúncios, públicos e campanhas para atrair clientes novos.', 'megaphone'),
  ('conteudo-e-whatsapp', 4, 'Conteúdo e WhatsApp', 'Posts, roteiros, listas de transmissão e mensagens que vendem.', 'message-circle'),
  ('atendimento-e-qualificacao', 5, 'Atendimento e qualificação', 'Atenda rápido e descubra quem está pronto para comprar.', 'headset'),
  ('negociacao-e-objecoes', 6, 'Negociação e objeções', 'Respostas para "tá caro", "vou pensar" e outras objeções.', 'shield'),
  ('follow-up-e-fechamento', 7, 'Follow-up e fechamento', 'Retome contatos e conduza o cliente até o sim.', 'handshake'),
  ('pos-venda-e-recompra', 8, 'Pós-venda e recompra', 'Encante depois da venda e faça o cliente voltar.', 'repeat'),
  ('gestao-comercial', 9, 'Gestão comercial', 'Metas, rotinas e acompanhamento da equipe de vendas.', 'bar-chart'),
  ('planejamento-comercial', 10, 'Planejamento comercial', 'Planos de vendas, calendário e estratégia do período.', 'calendar');
