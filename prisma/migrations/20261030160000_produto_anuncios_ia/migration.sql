-- Produto 04 — Biblioteca de Anúncios IA: 6 módulos e os 30 prompts oficiais (texto mantido como veio;
-- cada "- Campo: [CHAVE]" vira campo do formulário). A "Continuação sugerida" vira o prompt de
-- continuação da ferramenta (coluna nova, vale pra qualquer produto). Prompts com regras próprias
-- → sem as regras gerais de qualidade.
ALTER TABLE "CentralFerramenta" ADD COLUMN "continuacao" TEXT NOT NULL DEFAULT '';

UPDATE "InfoProduto" SET "regrasQualidade" = false, "publicado" = true,
  "descricao" = '30 prompts especializados em anúncios para o ChatGPT ou o Claude: Meta Ads, Google Ads, roteiros de vídeo, hooks e copies, criativos e prompts de imagem, campanhas e otimização.'
WHERE "id" = 'produto-anuncios-ia';

INSERT INTO "CentralModulo" ("id", "numero", "nome", "descricao", "icone", "produtoId") VALUES
  ('anuncios-meta', 23, 'Meta Ads e captação', 'Anúncios para WhatsApp, cadastros, promoções, remarketing e testes A/B.', 'megaphone', 'produto-anuncios-ia'),
  ('anuncios-google', 24, 'Google Ads e intenção de compra', 'Anúncios de pesquisa, palavras-chave, negativas e campanha local.', 'search', 'produto-anuncios-ia'),
  ('anuncios-video', 25, 'Roteiros e anúncios em vídeo', 'Roteiros de 15 e 30 segundos, antes e depois, primeira pessoa e tela dividida.', 'video', 'produto-anuncios-ia'),
  ('anuncios-copies', 26, 'Hooks, copies e argumentos', 'Ganchos, PAS, autoridade, objeções e variações de copy.', 'hash', 'produto-anuncios-ia'),
  ('anuncios-criativos', 27, 'Criativos estáticos e prompts de imagem', 'Briefings, prompts de imagem, carrossel, comparativo e UGC.', 'image', 'produto-anuncios-ia'),
  ('anuncios-campanhas', 28, 'Campanhas, ofertas e otimização', 'Campanhas de 7 dias, calendário, diagnóstico de métricas e lançamentos.', 'calendar', 'produto-anuncios-ia')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CentralFerramenta" ("id", "updatedAt", "slug", "moduloId", "nome", "descricao", "objetivo", "campos", "prompt", "instrucoes", "icone", "publicada", "permitirCopiarPrompt", "ordem", "comoUsar", "formatoResposta", "continuacao") VALUES
  ('anuncios-01', CURRENT_TIMESTAMP, 'anuncio-para-gerar-conversas-no-whatsapp', 'anuncios-meta', 'Anúncio para gerar conversas no WhatsApp', 'Crie 3 anúncios para conversas no WhatsApp com ângulos distintos: dor, benefício e demonstração.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"regiao","label":"Região","tipo":"texto","obrigatorio":false,"perfil":"regiao"},{"key":"diferencial","label":"Diferencial","tipo":"textarea","obrigatorio":false,"perfil":"diferenciais"},{"key":"ofertaReal","label":"Oferta real","tipo":"texto","obrigatorio":false},{"key":"duvidasComuns","label":"Dúvidas comuns","tipo":"textarea","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Anúncio para gerar conversas no WhatsApp**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Público: {{publico}}
- Região: {{regiao}}
- Diferencial: {{diferencial}}
- Oferta real: {{ofertaReal}}
- Dúvidas comuns: {{duvidasComuns}}

**Sua tarefa**
Crie 3 anúncios para conversas no WhatsApp com ângulos distintos: dor, benefício e demonstração. Para cada um, entregue texto principal de até 90 palavras, título curto, CTA e primeira mensagem sugerida para iniciar a conversa. Inclua uma hipótese de teste A/B.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'megaphone', true, true, 1, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-02', CURRENT_TIMESTAMP, 'anuncio-de-geracao-de-cadastros', 'anuncios-meta', 'Anúncio de geração de cadastros', 'Proponha uma oferta de captação legítima e 3 criativos de formulário instantâneo.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"servico","label":"Serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"beneficio","label":"Benefício","tipo":"texto","obrigatorio":false},{"key":"motivoParaCadastro","label":"Motivo para cadastro","tipo":"texto","obrigatorio":false},{"key":"formulario","label":"Formulário","tipo":"texto","obrigatorio":false},{"key":"condicoes","label":"Condições","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Anúncio de geração de cadastros**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Serviço: {{servico}}
- Público: {{publico}}
- Benefício: {{beneficio}}
- Motivo para cadastro: {{motivoParaCadastro}}
- Formulário: {{formulario}}
- Condições: {{condicoes}}

**Sua tarefa**
Proponha uma oferta de captação legítima e 3 criativos de formulário instantâneo. Crie headline, texto do anúncio, descrição do formulário, até 5 perguntas de qualificação sem coletar dados desnecessários e mensagem de confirmação.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'megaphone', true, true, 2, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-03', CURRENT_TIMESTAMP, 'anuncio-de-oferta-promocional', 'anuncios-meta', 'Anúncio de oferta promocional', 'Crie 3 versões de anúncio para uma promoção verdadeira; destaque economia somente se os preços comparativos forem comprovados.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"preco","label":"Preço","tipo":"texto","obrigatorio":false},{"key":"condicao","label":"Condição","tipo":"texto","obrigatorio":false},{"key":"prazo","label":"Prazo","tipo":"texto","obrigatorio":false},{"key":"estoqueVerificado","label":"Estoque verificado","tipo":"texto","obrigatorio":false},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Anúncio de oferta promocional**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Preço: {{preco}}
- Condição: {{condicao}}
- Prazo: {{prazo}}
- Estoque verificado: {{estoqueVerificado}}
- Público: {{publico}}

**Sua tarefa**
Crie 3 versões de anúncio para uma promoção verdadeira; destaque economia somente se os preços comparativos forem comprovados. Entregue textos, títulos, CTA, ideias visuais e observações de condições.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'megaphone', true, true, 3, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-04', CURRENT_TIMESTAMP, 'anuncio-de-remarketing', 'anuncios-meta', 'Anúncio de remarketing', 'Crie 3 mensagens de remarketing adequadas ao estágio de interesse; inclua uma abordagem útil, uma de prova real e uma de esclarecimento de dúvidas.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"acaoAnteriorDoPublico","label":"Ação anterior do público","tipo":"textarea","obrigatorio":false},{"key":"objecoes","label":"Objeções","tipo":"textarea","obrigatorio":false},{"key":"provaDisponivel","label":"Prova disponível","tipo":"textarea","obrigatorio":false},{"key":"prazo","label":"Prazo","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Anúncio de remarketing**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Ação anterior do público: {{acaoAnteriorDoPublico}}
- Objeções: {{objecoes}}
- Prova disponível: {{provaDisponivel}}
- Prazo: {{prazo}}

**Sua tarefa**
Crie 3 mensagens de remarketing adequadas ao estágio de interesse; inclua uma abordagem útil, uma de prova real e uma de esclarecimento de dúvidas. Indique critérios de exclusão e frequência a monitorar sem inventar configurações oficiais.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'megaphone', true, true, 4, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-05', CURRENT_TIMESTAMP, 'plano-de-testes-a-b-para-criativos', 'anuncios-meta', 'Plano de testes A/B para criativos', 'Desenhe um teste com hipótese, variável isolada, versões A e B, métricas primária e secundárias, duração planejada por volume e regra de decisão.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"objetivo","label":"Objetivo","tipo":"texto","obrigatorio":false},{"key":"orcamento","label":"Orçamento","tipo":"texto","obrigatorio":false},{"key":"c2CriativosAtuais","label":"2 criativos atuais","tipo":"textarea","obrigatorio":true},{"key":"metricasAnteriores","label":"Métricas anteriores","tipo":"textarea","obrigatorio":false},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Plano de testes A/B para criativos**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Objetivo: {{objetivo}}
- Orçamento: {{orcamento}}
- 2 criativos atuais: {{c2CriativosAtuais}}
- Métricas anteriores: {{metricasAnteriores}}
- Público: {{publico}}

**Sua tarefa**
Desenhe um teste com hipótese, variável isolada, versões A e B, métricas primária e secundárias, duração planejada por volume e regra de decisão. Se não houver volume suficiente, indique que o teste será apenas exploratório.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'megaphone', true, true, 5, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-06', CURRENT_TIMESTAMP, 'anuncio-responsivo-de-pesquisa', 'anuncios-google', 'Anúncio responsivo de pesquisa', 'Crie 12 títulos de até 30 caracteres e 4 descrições de até 90 caracteres (verifique contagem); priorize relevância à busca, proposta de valor real e coerência com landing page.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"intencaoDeBusca","label":"Intenção de busca","tipo":"texto","obrigatorio":false},{"key":"regiao","label":"Região","tipo":"texto","obrigatorio":false,"perfil":"regiao"},{"key":"diferencial","label":"Diferencial","tipo":"textarea","obrigatorio":false,"perfil":"diferenciais"},{"key":"paginaDeDestino","label":"Página de destino","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Anúncio responsivo de pesquisa**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Intenção de busca: {{intencaoDeBusca}}
- Região: {{regiao}}
- Diferencial: {{diferencial}}
- Página de destino: {{paginaDeDestino}}

**Sua tarefa**
Crie 12 títulos de até 30 caracteres e 4 descrições de até 90 caracteres (verifique contagem); priorize relevância à busca, proposta de valor real e coerência com landing page. Entregue tabela com contagem de caracteres.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'search', true, true, 6, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-07', CURRENT_TIMESTAMP, 'pesquisa-de-palavras-chave-por-intencao', 'anuncios-google', 'Pesquisa de palavras-chave por intenção', 'Gere grupos hipotéticos de palavras-chave de intenção alta, média e informativa; explique intenção, grupo de anúncios sugerido e o que validar no Planejador de Palavras-chave.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"regiao","label":"Região","tipo":"texto","obrigatorio":false,"perfil":"regiao"},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"ticket","label":"Ticket","tipo":"texto","obrigatorio":false,"perfil":"ticketMedio"},{"key":"servicosExcluidos","label":"Serviços excluídos","tipo":"textarea","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Pesquisa de palavras-chave por intenção**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Região: {{regiao}}
- Público: {{publico}}
- Ticket: {{ticket}}
- Serviços excluídos: {{servicosExcluidos}}

**Sua tarefa**
Gere grupos hipotéticos de palavras-chave de intenção alta, média e informativa; explique intenção, grupo de anúncios sugerido e o que validar no Planejador de Palavras-chave. Não invente volumes nem CPC.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'search', true, true, 7, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-08', CURRENT_TIMESTAMP, 'lista-de-palavras-chave-negativas', 'anuncios-google', 'Lista de palavras-chave negativas', 'Sugira palavras negativas candidatas por tema, justificativa e riscos de bloquear tráfego válido; diferencie termos para revisão de termos que podem ser aplicados após confirmação.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"servicosQueNaoOferece","label":"Serviços que não oferece","tipo":"textarea","obrigatorio":false},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"regiao","label":"Região","tipo":"texto","obrigatorio":false,"perfil":"regiao"},{"key":"buscasIndesejadas","label":"Buscas indesejadas","tipo":"textarea","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Lista de palavras-chave negativas**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Serviços que não oferece: {{servicosQueNaoOferece}}
- Público: {{publico}}
- Região: {{regiao}}
- Buscas indesejadas: {{buscasIndesejadas}}

**Sua tarefa**
Sugira palavras negativas candidatas por tema, justificativa e riscos de bloquear tráfego válido; diferencie termos para revisão de termos que podem ser aplicados após confirmação. Não apresente termos como certezas sem dados de pesquisa.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'search', true, true, 8, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-09', CURRENT_TIMESTAMP, 'estrutura-de-campanha-local-de-pesquisa', 'anuncios-google', 'Estrutura de campanha local de pesquisa', 'Desenhe uma campanha simples com grupos temáticos, exemplos de termos, anúncios, ativos pertinentes, páginas de destino e checklist de rastreamento.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"servico","label":"Serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"cidadesAtendidas","label":"Cidades atendidas","tipo":"texto","obrigatorio":false,"perfil":"regiao"},{"key":"orcamentoDiario","label":"Orçamento diário","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo","tipo":"texto","obrigatorio":false},{"key":"horariosDeAtendimento","label":"Horários de atendimento","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Estrutura de campanha local de pesquisa**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Serviço: {{servico}}
- Cidades atendidas: {{cidadesAtendidas}}
- Orçamento diário: {{orcamentoDiario}}
- Objetivo: {{objetivo}}
- Horários de atendimento: {{horariosDeAtendimento}}

**Sua tarefa**
Desenhe uma campanha simples com grupos temáticos, exemplos de termos, anúncios, ativos pertinentes, páginas de destino e checklist de rastreamento. Não invente custos, resultados ou extensões indisponíveis.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'search', true, true, 9, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-10', CURRENT_TIMESTAMP, 'diagnostico-de-relevancia-anuncio-e-landing', 'anuncios-google', 'Diagnóstico de relevância anúncio e landing', 'Compare promessa do anúncio com a página de destino: clareza, consistência, objeções, elementos de confiança e próximo passo.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"textoDoAnuncio","label":"Texto do anúncio","tipo":"textarea","obrigatorio":true},{"key":"termosBuscados","label":"Termos buscados","tipo":"textarea","obrigatorio":false},{"key":"textoDaLanding","label":"Texto da landing","tipo":"textarea","obrigatorio":true},{"key":"ctaEObjetivo","label":"CTA e objetivo","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Diagnóstico de relevância anúncio e landing**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Texto do anúncio: {{textoDoAnuncio}}
- Termos buscados: {{termosBuscados}}
- Texto da landing: {{textoDaLanding}}
- Cta e objetivo: {{ctaEObjetivo}}

**Sua tarefa**
Compare promessa do anúncio com a página de destino: clareza, consistência, objeções, elementos de confiança e próximo passo. Entregue matriz de problemas, prioridade, sugestão de ajuste e texto reescrito.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'search', true, true, 10, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-11', CURRENT_TIMESTAMP, 'roteiro-aida-de-30-segundos', 'anuncios-video', 'Roteiro AIDA de 30 segundos', 'Crie roteiro falado de 30 segundos por AIDA, separado em cenas com duração aproximada, fala exata, ação visual, texto de tela e CTA.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"dor","label":"Dor","tipo":"texto","obrigatorio":false},{"key":"beneficioComprovado","label":"Benefício comprovado","tipo":"textarea","obrigatorio":false},{"key":"oferta","label":"Oferta","tipo":"texto","obrigatorio":false},{"key":"cta","label":"CTA","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Roteiro AIDA de 30 segundos**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Público: {{publico}}
- Dor: {{dor}}
- Benefício comprovado: {{beneficioComprovado}}
- Oferta: {{oferta}}
- Cta: {{cta}}

**Sua tarefa**
Crie roteiro falado de 30 segundos por AIDA, separado em cenas com duração aproximada, fala exata, ação visual, texto de tela e CTA. Evite garantias de resultado.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'video', true, true, 11, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-12', CURRENT_TIMESTAMP, 'roteiro-de-15-segundos-para-reels', 'anuncios-video', 'Roteiro de 15 segundos para Reels', 'Crie 3 roteiros curtos de até 15 segundos com gancho nos primeiros 2 segundos, demonstração e chamada final.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"maiorBeneficio","label":"Maior benefício","tipo":"texto","obrigatorio":false},{"key":"formatoDeGravacao","label":"Formato de gravação","tipo":"texto","obrigatorio":false},{"key":"cta","label":"CTA","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Roteiro de 15 segundos para Reels**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Público: {{publico}}
- Maior benefício: {{maiorBeneficio}}
- Formato de gravação: {{formatoDeGravacao}}
- Cta: {{cta}}

**Sua tarefa**
Crie 3 roteiros curtos de até 15 segundos com gancho nos primeiros 2 segundos, demonstração e chamada final. Inclua falas, planos de câmera e sobreposição textual.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'video', true, true, 12, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-13', CURRENT_TIMESTAMP, 'roteiro-de-demonstracao-antes-e-depois', 'anuncios-video', 'Roteiro de demonstração antes e depois', 'Crie um anúncio com abertura, estado inicial, demonstração, resultado comprovado e CTA.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produtoOuServico","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"transformacaoReal","label":"Transformação real","tipo":"textarea","obrigatorio":false},{"key":"materiaisDisponiveis","label":"Materiais disponíveis","tipo":"textarea","obrigatorio":false},{"key":"limitesDaComparacao","label":"Limites da comparação","tipo":"textarea","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Roteiro de demonstração antes e depois**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto ou serviço: {{produtoOuServico}}
- Transformação real: {{transformacaoReal}}
- Materiais disponíveis: {{materiaisDisponiveis}}
- Limites da comparação: {{limitesDaComparacao}}

**Sua tarefa**
Crie um anúncio com abertura, estado inicial, demonstração, resultado comprovado e CTA. Caso não haja imagens reais de antes e depois, ofereça alternativa demonstrativa sem simular depoimentos ou resultados.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'video', true, true, 13, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-14', CURRENT_TIMESTAMP, 'roteiro-em-primeira-pessoa-do-empresario', 'anuncios-video', 'Roteiro em primeira pessoa do empresário', 'Crie 2 roteiros em primeira pessoa com storytelling realista do dia a dia do empresário, tensão, descoberta e solução, sem atribuir histórias inventadas à empresa.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"tipoDeNegocio","label":"Tipo de negócio","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"desafioCotidiano","label":"Desafio cotidiano","tipo":"textarea","obrigatorio":false},{"key":"solucao","label":"Solução","tipo":"texto","obrigatorio":false},{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tom","label":"Tom","tipo":"texto","obrigatorio":false,"perfil":"tomDeVoz"}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Roteiro em primeira pessoa do empresário**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Tipo de negócio: {{tipoDeNegocio}}
- Desafio cotidiano: {{desafioCotidiano}}
- Solução: {{solucao}}
- Produto: {{produto}}
- Tom: {{tom}}

**Sua tarefa**
Crie 2 roteiros em primeira pessoa com storytelling realista do dia a dia do empresário, tensão, descoberta e solução, sem atribuir histórias inventadas à empresa. Inclua locução, cenas e CTA.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'video', true, true, 14, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-15', CURRENT_TIMESTAMP, 'roteiro-educativo-em-tela-dividida', 'anuncios-video', 'Roteiro educativo em tela dividida', 'Crie um roteiro de tela dividida com comparação entre erro comum e alternativa recomendada, falas exatas e cenas para os dois lados; termine com convite comercial coerente.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"mitoOuErroComum","label":"Mito ou erro comum","tipo":"texto","obrigatorio":false},{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"ensinamento","label":"Ensinamento","tipo":"texto","obrigatorio":false},{"key":"cta","label":"CTA","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Roteiro educativo em tela dividida**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Mito ou erro comum: {{mitoOuErroComum}}
- Produto: {{produto}}
- Público: {{publico}}
- Ensinamento: {{ensinamento}}
- Cta: {{cta}}

**Sua tarefa**
Crie um roteiro de tela dividida com comparação entre erro comum e alternativa recomendada, falas exatas e cenas para os dois lados; termine com convite comercial coerente.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'video', true, true, 15, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-16', CURRENT_TIMESTAMP, '20-ganchos-para-anuncios', 'anuncios-copies', '20 ganchos para anúncios', 'Gere 20 hooks originais distribuídos em curiosidade, problema, demonstração, contraste e pergunta.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"dorPrincipal","label":"Dor principal","tipo":"texto","obrigatorio":false},{"key":"objecoes","label":"Objeções","tipo":"textarea","obrigatorio":false},{"key":"tom","label":"Tom","tipo":"texto","obrigatorio":false,"perfil":"tomDeVoz"}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **20 ganchos para anúncios**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Público: {{publico}}
- Dor principal: {{dorPrincipal}}
- Objeções: {{objecoes}}
- Tom: {{tom}}

**Sua tarefa**
Gere 20 hooks originais distribuídos em curiosidade, problema, demonstração, contraste e pergunta. Avalie clareza, plausibilidade e adequação ao público; selecione 5 para teste.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'hash', true, true, 16, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-17', CURRENT_TIMESTAMP, 'copy-pas-para-conversao', 'anuncios-copies', 'Copy PAS para conversão', 'Escreva 3 anúncios PAS (problema, agitação, solução) sem manipulação emocional ou alegações não comprovadas, com texto principal, título e CTA.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"dor","label":"Dor","tipo":"texto","obrigatorio":false},{"key":"consequenciasReais","label":"Consequências reais","tipo":"textarea","obrigatorio":false},{"key":"solucao","label":"Solução","tipo":"texto","obrigatorio":false},{"key":"cta","label":"CTA","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Copy PAS para conversão**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Dor: {{dor}}
- Consequências reais: {{consequenciasReais}}
- Solução: {{solucao}}
- Cta: {{cta}}

**Sua tarefa**
Escreva 3 anúncios PAS (problema, agitação, solução) sem manipulação emocional ou alegações não comprovadas, com texto principal, título e CTA.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'hash', true, true, 17, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-18', CURRENT_TIMESTAMP, 'copy-de-autoridade-sem-exageros', 'anuncios-copies', 'Copy de autoridade sem exageros', 'Crie 3 anúncios que apresentem credibilidade usando apenas evidências fornecidas.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"experienciaComprovavel","label":"Experiência comprovável","tipo":"textarea","obrigatorio":false},{"key":"diferenciais","label":"Diferenciais","tipo":"textarea","obrigatorio":false,"perfil":"diferenciais"},{"key":"casesAutorizados","label":"Cases autorizados","tipo":"textarea","obrigatorio":false},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Copy de autoridade sem exageros**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Experiência comprovável: {{experienciaComprovavel}}
- Diferenciais: {{diferenciais}}
- Cases autorizados: {{casesAutorizados}}
- Público: {{publico}}

**Sua tarefa**
Crie 3 anúncios que apresentem credibilidade usando apenas evidências fornecidas. Quando faltarem números ou depoimentos reais, substitua por demonstrações de processo e perguntas de valor.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'hash', true, true, 18, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-19', CURRENT_TIMESTAMP, 'resposta-a-objecoes-no-proprio-anuncio', 'anuncios-copies', 'Resposta a objeções no próprio anúncio', 'Crie um anúncio para cada objeção, antecipando a dúvida sem constranger o público; entregue hook, explicação objetiva, prova ou ressalva e CTA.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"c3ObjecoesReais","label":"3 objeções reais","tipo":"textarea","obrigatorio":true},{"key":"condicoesComerciais","label":"Condições comerciais","tipo":"texto","obrigatorio":false},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Resposta a objeções no próprio anúncio**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- 3 objeções reais: {{c3ObjecoesReais}}
- Condições comerciais: {{condicoesComerciais}}
- Público: {{publico}}

**Sua tarefa**
Crie um anúncio para cada objeção, antecipando a dúvida sem constranger o público; entregue hook, explicação objetiva, prova ou ressalva e CTA.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'hash', true, true, 19, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-20', CURRENT_TIMESTAMP, 'variacoes-de-uma-copy-vencedora', 'anuncios-copies', 'Variações de uma copy vencedora', 'Gere 8 variações controladas: 2 de hook, 2 de benefício, 2 de CTA e 2 de estrutura; explique o que mudou e como testar sem atribuir causalidade aos dados insuficientes.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"copyOriginal","label":"Copy original","tipo":"textarea","obrigatorio":true},{"key":"objetivo","label":"Objetivo","tipo":"texto","obrigatorio":false},{"key":"oQuePerformou","label":"O que performou","tipo":"texto","obrigatorio":false},{"key":"metricasDisponiveis","label":"Métricas disponíveis","tipo":"textarea","obrigatorio":false},{"key":"restricoes","label":"Restrições","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Variações de uma copy vencedora**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Copy original: {{copyOriginal}}
- Objetivo: {{objetivo}}
- O que performou: {{oQuePerformou}}
- Métricas disponíveis: {{metricasDisponiveis}}
- Restrições: {{restricoes}}

**Sua tarefa**
Gere 8 variações controladas: 2 de hook, 2 de benefício, 2 de CTA e 2 de estrutura; explique o que mudou e como testar sem atribuir causalidade aos dados insuficientes.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'hash', true, true, 20, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-21', CURRENT_TIMESTAMP, 'briefing-de-anuncio-estatico', 'anuncios-criativos', 'Briefing de anúncio estático', 'Crie briefing para anúncio estático com conceito, hierarquia de texto, headline, prova disponível, CTA, layout e instruções de acessibilidade; limite texto em tela e proponha 2 variações.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"beneficio","label":"Benefício","tipo":"texto","obrigatorio":false},{"key":"identidadeVisual","label":"Identidade visual","tipo":"texto","obrigatorio":false},{"key":"formato","label":"Formato","tipo":"texto","obrigatorio":false},{"key":"fotoDisponivel","label":"Foto disponível","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Briefing de anúncio estático**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Público: {{publico}}
- Benefício: {{beneficio}}
- Identidade visual: {{identidadeVisual}}
- Formato: {{formato}}
- Foto disponível: {{fotoDisponivel}}

**Sua tarefa**
Crie briefing para anúncio estático com conceito, hierarquia de texto, headline, prova disponível, CTA, layout e instruções de acessibilidade; limite texto em tela e proponha 2 variações.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'image', true, true, 21, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-22', CURRENT_TIMESTAMP, 'prompt-para-imagem-publicitaria-com-ia', 'anuncios-criativos', 'Prompt para imagem publicitária com IA', 'Escreva um prompt detalhado para gerador de imagem com composição, câmera, luz, materiais, cores e espaço negativo para adicionar texto no editor.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"cenario","label":"Cenário","tipo":"texto","obrigatorio":false},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"referenciasEsteticas","label":"Referências estéticas","tipo":"textarea","obrigatorio":false},{"key":"formato","label":"Formato","tipo":"texto","obrigatorio":false},{"key":"elementosProibidos","label":"Elementos proibidos","tipo":"textarea","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Prompt para imagem publicitária com IA**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Cenário: {{cenario}}
- Público: {{publico}}
- Referências estéticas: {{referenciasEsteticas}}
- Formato: {{formato}}
- Elementos proibidos: {{elementosProibidos}}

**Sua tarefa**
Escreva um prompt detalhado para gerador de imagem com composição, câmera, luz, materiais, cores e espaço negativo para adicionar texto no editor. Não exija logos ou rótulos precisos sem referências; evite representar resultados falsos.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'image', true, true, 22, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-23', CURRENT_TIMESTAMP, 'carrossel-de-anuncio-de-5-cards', 'anuncios-criativos', 'Carrossel de anúncio de 5 cards', 'Crie um carrossel de 5 cards com título curto por card, texto de apoio, instrução visual e progressão narrativa: problema, explicação, solução, diferencial, CTA.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"dor","label":"Dor","tipo":"texto","obrigatorio":false},{"key":"beneficio","label":"Benefício","tipo":"texto","obrigatorio":false},{"key":"diferenciais","label":"Diferenciais","tipo":"textarea","obrigatorio":false,"perfil":"diferenciais"},{"key":"evidencias","label":"Evidências","tipo":"textarea","obrigatorio":false},{"key":"cta","label":"CTA","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Carrossel de anúncio de 5 cards**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Dor: {{dor}}
- Benefício: {{beneficio}}
- Diferenciais: {{diferenciais}}
- Evidências: {{evidencias}}
- Cta: {{cta}}

**Sua tarefa**
Crie um carrossel de 5 cards com título curto por card, texto de apoio, instrução visual e progressão narrativa: problema, explicação, solução, diferencial, CTA.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'image', true, true, 23, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-24', CURRENT_TIMESTAMP, 'criativo-comparativo-de-propostas', 'anuncios-criativos', 'Criativo comparativo de propostas', 'Crie anúncio visual comparando duas opções da própria empresa com critérios objetivos e ressalvas.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"opcaoA","label":"Opção A","tipo":"texto","obrigatorio":true},{"key":"opcaoB","label":"Opção B","tipo":"texto","obrigatorio":true},{"key":"atributosVerificaveis","label":"Atributos verificáveis","tipo":"textarea","obrigatorio":false},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"decisao","label":"Decisão","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Criativo comparativo de propostas**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Opção a: {{opcaoA}}
- Opção b: {{opcaoB}}
- Atributos verificáveis: {{atributosVerificaveis}}
- Público: {{publico}}
- Decisão: {{decisao}}

**Sua tarefa**
Crie anúncio visual comparando duas opções da própria empresa com critérios objetivos e ressalvas. Proponha layout, títulos, bullets e texto do anúncio; não difame concorrentes.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'image', true, true, 24, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-25', CURRENT_TIMESTAMP, 'direcao-criativa-para-ugc', 'anuncios-criativos', 'Direção criativa para UGC', 'Escreva um briefing de vídeo UGC com falas naturais, cenas possíveis, uso real do produto e CTAs; não invente depoimentos, resultados, patrocínios ou consumidores satisfeitos.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"experienciaReal","label":"Experiência real","tipo":"textarea","obrigatorio":false},{"key":"quemGrava","label":"Quem grava","tipo":"texto","obrigatorio":false},{"key":"provasDisponiveis","label":"Provas disponíveis","tipo":"textarea","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Direção criativa para UGC**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Público: {{publico}}
- Experiência real: {{experienciaReal}}
- Quem grava: {{quemGrava}}
- Provas disponíveis: {{provasDisponiveis}}

**Sua tarefa**
Escreva um briefing de vídeo UGC com falas naturais, cenas possíveis, uso real do produto e CTAs; não invente depoimentos, resultados, patrocínios ou consumidores satisfeitos.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'image', true, true, 25, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-26', CURRENT_TIMESTAMP, 'campanha-comercial-de-7-dias', 'anuncios-campanhas', 'Campanha comercial de 7 dias', 'Crie plano de campanha de 7 dias com pauta de criativos, cópias, sequência, checklist de execução, métricas e critérios de revisão.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"produto","label":"Produto","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"objetivo","label":"Objetivo","tipo":"texto","obrigatorio":false},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"canais","label":"Canais","tipo":"texto","obrigatorio":false,"perfil":"canais"},{"key":"orcamento","label":"Orçamento","tipo":"texto","obrigatorio":false},{"key":"ofertaReal","label":"Oferta real","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Campanha comercial de 7 dias**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Produto: {{produto}}
- Objetivo: {{objetivo}}
- Público: {{publico}}
- Canais: {{canais}}
- Orçamento: {{orcamento}}
- Oferta real: {{ofertaReal}}

**Sua tarefa**
Crie plano de campanha de 7 dias com pauta de criativos, cópias, sequência, checklist de execução, métricas e critérios de revisão. Não prometa vendas.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'calendar', true, true, 26, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-27', CURRENT_TIMESTAMP, 'calendario-de-ofertas-do-mes', 'anuncios-campanhas', 'Calendário de ofertas do mês', 'Proponha 4 campanhas semanais e suas peças principais, considerando capacidade e preservação de margem.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"negocio","label":"Negócio","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"portfolio","label":"Portfólio","tipo":"textarea","obrigatorio":false,"perfil":"produtos"},{"key":"sazonalidade","label":"Sazonalidade","tipo":"texto","obrigatorio":false},{"key":"capacidade","label":"Capacidade","tipo":"texto","obrigatorio":false},{"key":"margemOuRestricaoDeDesconto","label":"Margem ou restrição de desconto","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Calendário de ofertas do mês**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Negócio: {{negocio}}
- Portfólio: {{portfolio}}
- Sazonalidade: {{sazonalidade}}
- Capacidade: {{capacidade}}
- Margem ou restrição de desconto: {{margemOuRestricaoDeDesconto}}

**Sua tarefa**
Proponha 4 campanhas semanais e suas peças principais, considerando capacidade e preservação de margem. Sinalize ofertas que dependem de aprovação de preço ou estoque.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'calendar', true, true, 27, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-28', CURRENT_TIMESTAMP, 'diagnostico-de-anuncios-com-metricas', 'anuncios-campanhas', 'Diagnóstico de anúncios com métricas', 'Valide as métricas, calcule indicadores somente com denominadores disponíveis e compare campanhas sem confundir leads com vendas.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"tabelaDeCampanhasComGasto","label":"Tabela de campanhas com gasto","tipo":"textarea","obrigatorio":true},{"key":"impressoes","label":"Impressões","tipo":"texto","obrigatorio":false},{"key":"cliques","label":"Cliques","tipo":"texto","obrigatorio":false},{"key":"leads","label":"Leads","tipo":"texto","obrigatorio":false},{"key":"vendas","label":"Vendas","tipo":"texto","obrigatorio":false},{"key":"receita","label":"Receita","tipo":"texto","obrigatorio":false},{"key":"periodoEObjetivo","label":"Período e objetivo","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Diagnóstico de anúncios com métricas**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Tabela de campanhas com gasto: {{tabelaDeCampanhasComGasto}}
- Impressões: {{impressoes}}
- Cliques: {{cliques}}
- Leads: {{leads}}
- Vendas: {{vendas}}
- Receita: {{receita}}
- Período e objetivo: {{periodoEObjetivo}}

**Sua tarefa**
Valide as métricas, calcule indicadores somente com denominadores disponíveis e compare campanhas sem confundir leads com vendas. Identifique fatos, hipóteses e 5 testes priorizados. Não use referências universais de CTR ou CPA sem contexto.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'calendar', true, true, 28, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-29', CURRENT_TIMESTAMP, 'plano-de-otimizacao-de-criativos', 'anuncios-campanhas', 'Plano de otimização de criativos', 'Proponha uma matriz manter, testar, revisar ou pausar com justificativa e ressalvas sobre amostras pequenas.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"anunciosAtuais","label":"Anúncios atuais","tipo":"textarea","obrigatorio":true},{"key":"metricasPorCriativo","label":"Métricas por criativo","tipo":"textarea","obrigatorio":true},{"key":"frequencia","label":"Frequência","tipo":"texto","obrigatorio":false},{"key":"periodo","label":"Período","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Plano de otimização de criativos**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Anúncios atuais: {{anunciosAtuais}}
- Métricas por criativo: {{metricasPorCriativo}}
- Frequência: {{frequencia}}
- Período: {{periodo}}
- Objetivo: {{objetivo}}

**Sua tarefa**
Proponha uma matriz manter, testar, revisar ou pausar com justificativa e ressalvas sobre amostras pequenas. Entregue 5 novos ângulos criativos e uma sequência de testes.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'calendar', true, true, 29, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.'),
  ('anuncios-30', CURRENT_TIMESTAMP, 'campanha-de-lancamento-de-novo-servico', 'anuncios-campanhas', 'Campanha de lançamento de novo serviço', 'Crie plano de lançamento com teaser, anúncio principal, vídeo, posts de reforço, perguntas frequentes e follow-up dos interessados.', 'Peças prontas com diagnóstico, justificativa da estratégia e próximos passos de implementação e teste.', '[{"key":"servico","label":"Serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"publico","label":"Público","tipo":"textarea","obrigatorio":false,"perfil":"publico"},{"key":"necessidade","label":"Necessidade","tipo":"texto","obrigatorio":false},{"key":"diferenciaisComprovados","label":"Diferenciais comprovados","tipo":"textarea","obrigatorio":false,"perfil":"diferenciais"},{"key":"disponibilidade","label":"Disponibilidade","tipo":"texto","obrigatorio":false},{"key":"cta","label":"CTA","tipo":"texto","obrigatorio":false}]'::jsonb, 'Atue como estrategista de marketing de performance, copywriter e diretor criativo especializado em pequenos e médios negócios no Brasil.

Estou preparando uma peça ou estratégia publicitária específica: **Campanha de lançamento de novo serviço**. Não se limite a dar conselhos genéricos: produza materiais utilizáveis.

**Informações para personalização**
- Serviço: {{servico}}
- Público: {{publico}}
- Necessidade: {{necessidade}}
- Diferenciais comprovados: {{diferenciaisComprovados}}
- Disponibilidade: {{disponibilidade}}
- Cta: {{cta}}

**Sua tarefa**
Crie plano de lançamento com teaser, anúncio principal, vídeo, posts de reforço, perguntas frequentes e follow-up dos interessados. Inclua cronograma e dependências antes de divulgar condições.

**Formato da entrega**
1. Diagnóstico breve do contexto e das informações incompletas.
2. Entrega principal solicitada, com textos prontos e seções claras.
3. Justificativa de até 4 linhas para a estratégia escolhida.
4. Próximos passos de implementação e teste.

### Regras obrigatórias
- Use o contexto disponível nesta conversa ou projeto **somente quando realmente acessível**; priorize os dados preenchidos acima. Se faltarem informações indispensáveis, faça até 3 perguntas objetivas ou explicite as hipóteses.
- Não invente preços, descontos, certificações, depoimentos, garantias, estoques, prazos ou métricas.
- Evite alegar resultados garantidos. Considere políticas de publicidade da plataforma escolhida e legislação aplicável; sinalize pontos que exijam revisão.
- Entregue o material final em português do Brasil, pronto para uso e com uma seção curta **Como aplicar e testar**.
- Diferencie fatos fornecidos de sugestões e hipóteses.', '', 'calendar', true, true, 30, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude. Depois da primeira resposta, use o prompt de continuação na mesma conversa para gerar variações de teste. Revise as peças e confirme preços, condições e políticas da plataforma de anúncios antes de publicar.', '', 'Com base no material que você acabou de produzir **nesta mesma conversa**, crie duas variações complementares, mantendo o contexto que realmente estiver disponível. Explique qual variável foi alterada em cada uma e o que medir no teste.')
ON CONFLICT ("slug") DO NOTHING;
