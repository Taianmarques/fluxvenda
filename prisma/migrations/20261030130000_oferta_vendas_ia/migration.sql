-- Oferta inicial da Vendas IA (inativa até o admin ativar em /admin/ofertas). Preços são os
-- planejados e editáveis no admin. Order bumps e upsell só aparecem no checkout quando os
-- produtos correspondentes forem publicados.
INSERT INTO "Oferta" ("id", "updatedAt", "slug", "nome", "ativa") VALUES
  ('oferta-vendas-ia', CURRENT_TIMESTAMP, 'vendas-ia', 'Vendas IA — 100 Prompts + complementos', false);

INSERT INTO "OfertaItem" ("id", "ofertaId", "produtoId", "papel", "precoCentavos", "chamada", "ordem") VALUES
  ('oi-vendas-ia-principal', 'oferta-vendas-ia', 'produto-100-prompts', 'PRINCIPAL', 4700, '', 0),
  ('oi-vendas-ia-analisador', 'oferta-vendas-ia', 'produto-analisador-vendas', 'ORDER_BUMP', 1990,
   'Leve também 10 prompts para analisar seus relatórios de vendas no ChatGPT ou no Claude: faturamento, vendedores, clientes inativos, curva ABC, margem e metas.', 1),
  ('oi-vendas-ia-whatsapp', 'oferta-vendas-ia', 'produto-whatsapp-vendedor', 'ORDER_BUMP', 1490,
   'Adicione 50 scripts de WhatsApp personalizados com os dados do seu negócio — da abordagem ao pós-venda.', 2),
  ('oi-vendas-ia-anuncios', 'oferta-vendas-ia', 'produto-anuncios-ia', 'UPSELL', 3700, '', 3);
