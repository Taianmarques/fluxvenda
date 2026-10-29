-- Infoprodutos: catálogo (produtos), ofertas (papel e preço de cada produto numa venda), compras,
-- direitos de acesso por usuário/produto e log de eventos de pagamento (idempotência).
-- Os 10 módulos atuais passam a pertencer ao produto 01 (100 prompts), que segue liberado pra
-- quem já tem a Plataforma B2B.

-- CreateTable
CREATE TABLE "InfoProduto" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "beneficio" TEXT NOT NULL DEFAULT '',
    "capaUrl" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'Vendas',
    "icone" TEXT NOT NULL DEFAULT 'sparkles',
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "precoReferenciaCentavos" INTEGER,
    "inclusoNaPlataforma" BOOLEAN NOT NULL DEFAULT false,
    "checkoutRef" TEXT,
    CONSTRAINT "InfoProduto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Oferta" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Oferta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfertaItem" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "precoCentavos" INTEGER NOT NULL,
    "chamada" TEXT NOT NULL DEFAULT '',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OfertaItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OfertaItem_papel_check" CHECK ("papel" IN ('PRINCIPAL', 'ORDER_BUMP', 'UPSELL')),
    CONSTRAINT "OfertaItem_preco_check" CHECK ("precoCentavos" >= 0)
);

CREATE TABLE "Compra" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ofertaId" TEXT,
    "compraOrigemId" TEXT,
    "profileId" TEXT,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT '',
    "cpfCnpj" TEXT NOT NULL DEFAULT '',
    "telefone" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "valorCentavos" INTEGER NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "asaasPaymentId" TEXT,
    "asaasInstallmentId" TEXT,
    "asaasCustomerId" TEXT,
    "pagoEm" TIMESTAMP(3),
    "encerradaEm" TIMESTAMP(3),
    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Compra_status_check" CHECK ("status" IN ('PENDENTE', 'PAGO', 'CANCELADO', 'REEMBOLSADO', 'ESTORNADO')),
    CONSTRAINT "Compra_valor_check" CHECK ("valorCentavos" >= 0)
);

CREATE TABLE "CompraItem" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "precoCentavos" INTEGER NOT NULL,
    CONSTRAINT "CompraItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcessoProduto" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "compraId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "revogadoEm" TIMESTAMP(3),
    "motivo" TEXT,
    "concedidoPor" TEXT,
    CONSTRAINT "AcessoProduto_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AcessoProduto_origem_check" CHECK ("origem" IN ('COMPRA', 'ADMIN'))
);

CREATE TABLE "PagamentoEvento" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provedor" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "paymentId" TEXT,
    CONSTRAINT "PagamentoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InfoProduto_slug_key" ON "InfoProduto"("slug");
CREATE UNIQUE INDEX "Oferta_slug_key" ON "Oferta"("slug");
CREATE UNIQUE INDEX "OfertaItem_ofertaId_produtoId_key" ON "OfertaItem"("ofertaId", "produtoId");
CREATE INDEX "OfertaItem_produtoId_idx" ON "OfertaItem"("produtoId");
CREATE UNIQUE INDEX "Compra_asaasPaymentId_key" ON "Compra"("asaasPaymentId");
CREATE INDEX "Compra_email_idx" ON "Compra"("email");
CREATE INDEX "Compra_profileId_createdAt_idx" ON "Compra"("profileId", "createdAt");
CREATE INDEX "Compra_asaasInstallmentId_idx" ON "Compra"("asaasInstallmentId");
CREATE UNIQUE INDEX "CompraItem_compraId_produtoId_key" ON "CompraItem"("compraId", "produtoId");
CREATE UNIQUE INDEX "AcessoProduto_compraId_produtoId_key" ON "AcessoProduto"("compraId", "produtoId");
CREATE INDEX "AcessoProduto_profileId_produtoId_idx" ON "AcessoProduto"("profileId", "produtoId");
-- Liberação manual: no máximo uma linha ADMIN por usuário/produto (compraId nulo não entra no unique acima)
CREATE UNIQUE INDEX "AcessoProduto_admin_unico" ON "AcessoProduto"("profileId", "produtoId") WHERE "origem" = 'ADMIN';
CREATE UNIQUE INDEX "PagamentoEvento_provedor_eventoId_key" ON "PagamentoEvento"("provedor", "eventoId");

-- AddForeignKey
ALTER TABLE "OfertaItem" ADD CONSTRAINT "OfertaItem_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "Oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfertaItem" ADD CONSTRAINT "OfertaItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "InfoProduto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "Oferta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "InfoProduto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcessoProduto" ADD CONSTRAINT "AcessoProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "InfoProduto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcessoProduto" ADD CONSTRAINT "AcessoProduto_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Catálogo inicial. Produto 01 publicado e incluso na Plataforma (quem já usa continua usando);
-- 02–04 como rascunho até terem conteúdo. Preços são de referência e editáveis no admin.
INSERT INTO "InfoProduto" ("id", "updatedAt", "slug", "nome", "descricao", "beneficio", "categoria", "icone", "publicado", "ordem", "precoReferenciaCentavos", "inclusoNaPlataforma") VALUES
  ('produto-100-prompts', CURRENT_TIMESTAMP, '100-prompts-vendas', '100 Prompts de IA para Vender Mais',
   'Escolha o que deseja fazer, responda algumas perguntas e receba um comando profissional pronto para utilizar na sua IA favorita.',
   '100 prompts inteligentes e personalizados para transformar o ChatGPT ou Claude em seu assistente de vendas.', 'Vendas', 'sparkles', true, 1, 4700, true),
  ('produto-analisador-vendas', CURRENT_TIMESTAMP, 'analisador-vendas', 'Analisador de Relatórios de Vendas',
   '10 prompts especializados para analisar seus relatórios de vendas no ChatGPT ou no Claude: faturamento, períodos, vendedores, clientes, produtos, inativos, curva ABC, margem, metas e plano de ação.',
   'Descubra o que seus números de vendas estão dizendo — sem planilha complicada.', 'Gestão comercial', 'bar-chart', false, 2, 1990, false),
  ('produto-whatsapp-vendedor', CURRENT_TIMESTAMP, 'whatsapp-vendedor', 'WhatsApp Vendedor',
   '50 scripts comerciais personalizados com os dados do seu negócio: abordagem, qualificação, orçamento, negociação, objeções, follow-up, fechamento e pós-venda.',
   'Mensagens prontas para vender mais pelo WhatsApp em cada etapa da conversa.', 'Vendas', 'message-circle', false, 3, 1490, false),
  ('produto-anuncios-ia', CURRENT_TIMESTAMP, 'anuncios-ia', 'Biblioteca de Anúncios IA',
   'Prompts especializados em anúncios: Meta Ads, Google Ads, hooks, roteiros de vídeo, criativos, ofertas e campanhas.',
   'Anúncios que chamam atenção e trazem clientes, criados com a sua IA.', 'Marketing', 'megaphone', false, 4, 3700, false);

-- Módulos existentes → produto 01
ALTER TABLE "CentralModulo" ADD COLUMN "produtoId" TEXT;
UPDATE "CentralModulo" SET "produtoId" = 'produto-100-prompts';
ALTER TABLE "CentralModulo" ALTER COLUMN "produtoId" SET NOT NULL;
ALTER TABLE "CentralModulo" ADD CONSTRAINT "CentralModulo_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "InfoProduto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "CentralModulo_produtoId_numero_idx" ON "CentralModulo"("produtoId", "numero");
