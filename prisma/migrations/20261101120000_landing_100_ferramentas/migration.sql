-- Landing "100 ferramentas" (/vendas-ia/100-ferramentas):
--   1. vídeo demonstrativo configurável por oferta (vazio = a landing mostra um aviso de vídeo em produção)
--   2. ferramentas de demonstração gratuita: mesma tabela e mesmo montador de prompt das ferramentas
--      da biblioteca, mas fora dela (publicada = false) e liberadas só pela API pública da demo
--   3. oferta de R$ 67 para a landing, com os mesmos complementos (order bumps e upsell) da oferta
--      vendas-ia — preços copiados de lá; criada em modo teste, como a vendas-ia está hoje
ALTER TABLE "Oferta" ADD COLUMN "videoDemoUrl" TEXT;
ALTER TABLE "CentralFerramenta" ADD COLUMN "demoPublica" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "Oferta" ("id", "updatedAt", "slug", "nome", "ativa", "sandbox") VALUES
  ('oferta-vendas-ia-ferramentas', CURRENT_TIMESTAMP, 'vendas-ia-ferramentas', 'Vendas IA — 100 ferramentas (landing R$ 67)', true, true)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "OfertaItem" ("id", "ofertaId", "produtoId", "papel", "precoCentavos", "chamada", "ordem")
SELECT 'oi-ferramentas-' || i."produtoId", 'oferta-vendas-ia-ferramentas', i."produtoId", i."papel",
       CASE WHEN i."papel" = 'PRINCIPAL' THEN 6700 ELSE i."precoCentavos" END, i."chamada", i."ordem"
FROM "OfertaItem" i
WHERE i."ofertaId" = 'oferta-vendas-ia'
  AND NOT EXISTS (SELECT 1 FROM "OfertaItem" x WHERE x."ofertaId" = 'oferta-vendas-ia-ferramentas');

-- Garante o principal mesmo se a oferta vendas-ia tiver sido alterada no admin
INSERT INTO "OfertaItem" ("id", "ofertaId", "produtoId", "papel", "precoCentavos", "chamada", "ordem")
SELECT 'oi-ferramentas-principal', 'oferta-vendas-ia-ferramentas', 'produto-100-prompts', 'PRINCIPAL', 6700, '', 0
WHERE NOT EXISTS (SELECT 1 FROM "OfertaItem" x WHERE x."ofertaId" = 'oferta-vendas-ia-ferramentas' AND x."produtoId" = 'produto-100-prompts');

INSERT INTO "CentralFerramenta" ("id", "updatedAt", "slug", "moduloId", "nome", "descricao", "objetivo", "campos", "prompt", "instrucoes", "icone", "publicada", "demoPublica", "permitirCopiarPrompt", "ordem", "formatoResposta") VALUES
-- (formatoResposta vazio: o que a ferramenta entrega já está no próprio prompt)
(
  'demo-recuperar-orcamento', CURRENT_TIMESTAMP, 'demo-recuperar-orcamento', 'follow-up-e-fechamento',
  '[Demo] Recuperar orçamento parado',
  'Retome um cliente que pediu orçamento e sumiu, sem pressão e sem desconto.',
  'Você recebe: o motivo provável do silêncio e 3 mensagens de retomada para WhatsApp.',
  '[{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcenaria de móveis planejados","maxCaracteres":120},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":true,"placeholder":"Ex: armário de cozinha sob medida","maxCaracteres":160},{"key":"situacao","label":"Situação do cliente","tipo":"textarea","obrigatorio":true,"placeholder":"Ex: mandei o orçamento de R$ 8.900 há 5 dias, ela disse que ia ver com o marido e não respondeu mais","maxCaracteres":600},{"key":"objetivo","label":"Objetivo da mensagem","tipo":"select","obrigatorio":true,"opcoes":["Retomar a conversa","Entender por que o cliente parou","Agendar uma conversa ou visita","Fechar a venda"]}]'::jsonb,
  'Atue como especialista em vendas consultivas pelo WhatsApp para pequenos negócios do segmento {{segmento}}.

SITUAÇÃO
Enviei um orçamento de {{produto}} e a conversa parou. O que aconteceu: {{situacao}}
Objetivo desta mensagem: {{objetivo}}.

O QUE VOCÊ DEVE FAZER
1. Em até duas linhas, diga qual é o motivo mais provável de o cliente ter parado de responder, com base na situação descrita.
2. Escreva 3 mensagens de retomada para WhatsApp, cada uma com uma abordagem diferente:
   - Mensagem 1: retomada leve, que facilite a resposta (uma pergunta simples de sim ou não).
   - Mensagem 2: retomada com valor: traga uma informação útil sobre {{produto}} que ajude o cliente a decidir.
   - Mensagem 3: encerramento educado, que deixa a porta aberta sem cobrar o cliente.
3. Para cada mensagem, diga quando enviar (quanto tempo depois do último contato) e como responder se o cliente reagir.

REGRAS
- No máximo 4 linhas por mensagem, tom humano e respeitoso, sem pressão.
- Não ofereça desconto e não invente prazo, escassez, depoimento ou condição que eu não informei.
- No máximo uma pergunta por mensagem.',
  '', 'file-text', false, true, false, 900,
  ''
),
(
  'demo-criar-anuncio', CURRENT_TIMESTAMP, 'demo-criar-anuncio', 'anuncios-e-aquisicao',
  '[Demo] Criar anúncio',
  'Anúncios para Instagram e Facebook com três ângulos diferentes, prontos para testar.',
  'Você recebe: 3 anúncios completos (gancho, texto, título, chamada e sugestão de imagem) e 5 ganchos extras.',
  '[{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":true,"placeholder":"Ex: estética automotiva","maxCaracteres":120},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":true,"placeholder":"Ex: lavagem completa com higienização interna","maxCaracteres":160},{"key":"publico","label":"Público-alvo","tipo":"textarea","obrigatorio":true,"placeholder":"Ex: donos de carro de 30 a 55 anos, moram na zona sul, usam o carro para trabalhar","maxCaracteres":400},{"key":"beneficio","label":"Principal benefício","tipo":"texto","obrigatorio":true,"placeholder":"Ex: carro com cheiro de novo em 3 horas, com busca e entrega","maxCaracteres":200},{"key":"objetivo","label":"Objetivo do anúncio","tipo":"select","obrigatorio":true,"opcoes":["Receber mensagens no WhatsApp","Trazer clientes até a loja","Vender pelo site ou loja online","Gerar cadastros de interessados"]}]'::jsonb,
  'Atue como copywriter especialista em anúncios de Instagram e Facebook para pequenos negócios do segmento {{segmento}}.

CONTEXTO
Produto ou serviço anunciado: {{produto}}
Público-alvo: {{publico}}
Principal benefício: {{beneficio}}
Objetivo do anúncio: {{objetivo}}

O QUE VOCÊ DEVE FAZER
Escreva 3 anúncios, cada um com um ângulo diferente:
- Anúncio 1, ângulo DOR: comece pelo problema que o público sente antes de comprar.
- Anúncio 2, ângulo BENEFÍCIO: mostre a vida depois de {{beneficio}}.
- Anúncio 3, ângulo DEMONSTRAÇÃO: mostre como o serviço ou produto funciona na prática.

Para cada anúncio, entregue:
1. Gancho: a primeira linha, que precisa parar a rolagem.
2. Texto principal: até 5 linhas curtas, na linguagem do público.
3. Título (até 40 caracteres).
4. Chamada para ação coerente com o objetivo: {{objetivo}}.
5. Sugestão de imagem ou vídeo, descrita para eu produzir com o celular.

Depois, entregue mais 5 ganchos alternativos para eu testar.

REGRAS
- Não invente resultados, números, depoimentos, prêmios ou promoções.
- Siga as políticas de anúncios da Meta: não aponte características pessoais do leitor (ex: "Você está endividado?") e não prometa resultado garantido.
- Frases curtas, sem jargão de marketing.',
  '', 'megaphone', false, true, false, 901,
  ''
),
(
  'demo-criar-oferta', CURRENT_TIMESTAMP, 'demo-criar-oferta', 'criacao-de-ofertas',
  '[Demo] Criar oferta',
  'Transforme seu produto em uma oferta clara, apoiada em diferenciais reais.',
  'Você recebe: proposta de valor, 3 versões de oferta, como apresentar o preço e respostas para 3 objeções.',
  '[{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":true,"placeholder":"Ex: clínica de fisioterapia","maxCaracteres":120},{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":true,"placeholder":"Ex: pacote de 10 sessões de fisioterapia para dor nas costas","maxCaracteres":160},{"key":"preco","label":"Preço","tipo":"texto","obrigatorio":false,"placeholder":"Ex: R$ 900 (deixe em branco se ainda não definiu)","ajuda":"Opcional.","maxCaracteres":60},{"key":"diferenciais","label":"Diferenciais comprovados","tipo":"textarea","obrigatorio":true,"placeholder":"Ex: atendimento individual de 50 minutos, fisioterapeuta com pós em coluna, avaliação inicial inclusa","ajuda":"Só o que for verdade e você puder mostrar.","maxCaracteres":500},{"key":"problema","label":"Problema que o produto resolve","tipo":"textarea","obrigatorio":true,"placeholder":"Ex: dor nas costas que atrapalha trabalhar e dormir","maxCaracteres":400}]'::jsonb,
  'Atue como estrategista de ofertas para pequenos negócios do segmento {{segmento}}.

CONTEXTO
Produto: {{produto}}
Preço: {{preco}}
Diferenciais comprovados: {{diferenciais}}
Problema que o produto resolve: {{problema}}

O QUE VOCÊ DEVE FAZER
1. Escreva a proposta de valor em uma frase: para quem é, qual problema resolve e por que escolher este negócio.
2. Crie 3 versões da oferta, cada uma com um ângulo diferente: o problema, o resultado e a comparação com a alternativa que o cliente usa hoje. Cada versão deve ter:
   - título;
   - para quem é;
   - o que está incluído;
   - por que agir agora, sem escassez falsa;
   - chamada para ação.
3. Diga como apresentar o preço para ele parecer justo. Se o preço não foi informado, explique como ancorar no valor sem inventar números.
4. Liste as 3 objeções mais prováveis do cliente e uma resposta curta para cada uma.

REGRAS
- Use apenas os diferenciais informados; não invente garantias, prêmios, números ou depoimentos.
- Linguagem do cliente final, sem termos técnicos de marketing.',
  '', 'gift', false, true, false, 902,
  ''
)
ON CONFLICT ("id") DO NOTHING;
