-- Produto 02 — Analisador de Relatórios de Vendas: 4 módulos e os 10 prompts oficiais (texto mantido
-- como veio; só os campos entre colchetes viram formulário). Os prompts já trazem regras próprias,
-- então o produto não recebe as regras gerais de qualidade; e pede o relatório como anexo na IA.
ALTER TABLE "InfoProduto" ADD COLUMN "regrasQualidade" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "InfoProduto" ADD COLUMN "anexoNecessario" TEXT;

UPDATE "InfoProduto" SET "regrasQualidade" = false, "anexoNecessario" = 'o relatório de vendas (planilha ou PDF)', "publicado" = true,
  "descricao" = '10 prompts especializados para analisar seus relatórios de vendas no ChatGPT ou no Claude: diagnóstico do faturamento, comparação de períodos, vendedores, clientes, produtos, clientes inativos, curva ABC, margem, metas e plano de ação.'
WHERE "id" = 'produto-analisador-vendas';

INSERT INTO "CentralModulo" ("id", "numero", "nome", "descricao", "icone", "produtoId") VALUES
  ('analisador-visao-geral', 11, 'Visão geral e metas', 'Diagnóstico do faturamento, comparação entre períodos e ritmo das metas.', 'line-chart', 'produto-analisador-vendas'),
  ('analisador-clientes', 12, 'Clientes', 'Carteira, clientes inativos e curva ABC.', 'users', 'produto-analisador-vendas'),
  ('analisador-produtos', 13, 'Produtos e margem', 'Mix de vendas, produtos campeões e rentabilidade.', 'cart', 'produto-analisador-vendas'),
  ('analisador-equipe-acao', 14, 'Equipe e plano de ação', 'Desempenho dos vendedores e plano comercial de 30 dias.', 'goal', 'produto-analisador-vendas')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CentralFerramenta" ("id", "updatedAt", "slug", "moduloId", "nome", "descricao", "objetivo", "campos", "prompt", "instrucoes", "icone", "publicada", "permitirCopiarPrompt", "ordem", "comoUsar", "formatoResposta") VALUES
  ('analisador-01', CURRENT_TIMESTAMP, 'diagnostico-geral-de-vendas', 'analisador-visao-geral', 'Diagnóstico Geral de Vendas', 'Identificar indicadores comerciais, riscos e oportunidades.', 'Identificar indicadores comerciais, riscos e oportunidades.', '[{"key":"empresa","label":"Empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"periodo","label":"Período do relatório","tipo":"texto","obrigatorio":true,"placeholder":"Ex: janeiro a junho de 2026"},{"key":"objetivo","label":"Objetivo comercial","tipo":"textarea","obrigatorio":false,"perfil":"objetivos"},{"key":"meta","label":"Meta de faturamento","tipo":"texto","obrigatorio":false,"placeholder":"Ex: R$ 120 mil no semestre"}]'::jsonb, 'Atue como consultor sênior de gestão comercial, inteligência de vendas e análise de dados para pequenas e médias empresas brasileiras.

CONTEXTO
- Empresa: {{empresa}}
- Segmento: {{segmento}}
- Período: {{periodo}}
- Objetivo: {{objetivo}}
- Meta de faturamento: {{meta}}

Analise o relatório de vendas que vou anexar nesta conversa.

ETAPA 1 — VALIDAÇÃO
1. Confirme que conseguiu acessar o arquivo.
2. Identifique colunas, datas, unidades e período efetivamente coberto.
3. Verifique campos ausentes, cancelamentos, devoluções e registros duplicados.
4. Identifique se cada linha representa um pedido ou um item do pedido.
5. Explique quais indicadores podem ser calculados com segurança.

ETAPA 2 — INDICADORES
Calcule, quando houver dados suficientes: faturamento por período, pedidos únicos, ticket médio, clientes compradores únicos, evolução das vendas, participação dos principais produtos, participação de vendedores e concentração do faturamento por cliente.

ETAPA 3 — DIAGNÓSTICO
Identifique cinco descobertas comerciais, quedas ou oscilações relevantes, pontos fortes comprovados, gargalos e oportunidades de crescimento. Cite números e períodos.

ETAPA 4 — AÇÕES
Proponha cinco ações priorizadas, cada uma com justificativa, responsável sugerido e indicador de acompanhamento.

FORMATO DE ENTREGA
- Resumo executivo.
- Tabela de indicadores com valores, períodos e fórmulas.
- Evidências numéricas para cada conclusão.
- Riscos e oportunidades, classificados por prioridade.
- Plano de ação de sete dias.

REGRAS
Não invente dados nem resultados. Mostre as fórmulas dos indicadores principais. Diferencie fatos, hipóteses e dados faltantes. Não trate faturamento como lucro. Se não conseguir ler o relatório, informe isso antes de qualquer análise.', '', 'line-chart', true, true, 1, 'Preencha os campos e prepare o prompt. Abra o ChatGPT ou o Claude, anexe o relatório de vendas (planilha ou PDF) e cole o prompt na mesma mensagem. Para preservar o contexto, use a mesma conversa das análises anteriores, quando houver. Revise os resultados e remova dados pessoais desnecessários antes de enviar arquivos.', ''),
  ('analisador-02', CURRENT_TIMESTAMP, 'comparacao-de-periodos', 'analisador-visao-geral', 'Comparação de Períodos', 'Comparar meses, semanas ou anos e identificar variações relevantes.', 'Comparar meses, semanas ou anos e identificar variações relevantes.', '[{"key":"empresa","label":"Empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"periodoA","label":"Período A (inicial)","tipo":"texto","obrigatorio":true,"placeholder":"Ex: setembro de 2026"},{"key":"periodoB","label":"Período B (comparação)","tipo":"texto","obrigatorio":true,"placeholder":"Ex: outubro de 2026"},{"key":"objetivo","label":"O que você quer entender","tipo":"textarea","obrigatorio":true,"placeholder":"Ex: por que o faturamento caiu em outubro"}]'::jsonb, 'Atue como analista de inteligência comercial especializado em comparação de períodos e tendências de vendas.

EMPRESA: {{empresa}}
SEGMENTO: {{segmento}}
PERÍODO A: {{periodoA}}
PERÍODO B: {{periodoB}}
OBJETIVO: {{objetivo}}

Analise o relatório de vendas anexado.

1. Valide o arquivo e confirme se ambos os períodos estão completos e comparáveis.
2. Calcule faturamento dos dois períodos e variação absoluta e percentual.
3. Compare pedidos únicos, ticket médio e quantidade de clientes compradores.
4. Identifique produtos, categorias e vendedores que contribuíram para a mudança, quando existirem dados.
5. Examine alterações no mix de vendas e na participação de clientes importantes.
6. Diferencie mudanças comprovadas de possíveis explicações que exigem investigação.
7. Quando períodos tiverem durações diferentes, inclua médias por dia comercial, se houver calendário ou dados suficientes.
8. Recomende ações para corrigir quedas ou aproveitar crescimento.

TABELA OBRIGATÓRIA
INDICADOR | PERÍODO A | PERÍODO B | VARIAÇÃO ABSOLUTA | VARIAÇÃO % | INTERPRETAÇÃO

Explique separadamente como mudanças no número de pedidos e no ticket médio impactaram a receita, sem afirmar causalidade sem evidência.

FINALIZE COM
- Três descobertas principais.
- Três riscos.
- Cinco ações prioritárias.
- Indicadores para monitorar pelos próximos 30 dias.

REGRAS: não invente valores. Identifique períodos incompletos, diferenças de cobertura e dados ausentes.', '', 'repeat', true, true, 2, 'Preencha os campos e prepare o prompt. Abra o ChatGPT ou o Claude, anexe o relatório de vendas (planilha ou PDF) e cole o prompt na mesma mensagem. Para preservar o contexto, use a mesma conversa das análises anteriores, quando houver. Revise os resultados e remova dados pessoais desnecessários antes de enviar arquivos.', ''),
  ('analisador-03', CURRENT_TIMESTAMP, 'desempenho-dos-vendedores', 'analisador-equipe-acao', 'Desempenho dos Vendedores', 'Avaliar metas, produtividade e oportunidades de melhoria da equipe.', 'Avaliar metas, produtividade e oportunidades de melhoria da equipe.', '[{"key":"empresa","label":"Empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"periodo","label":"Período do relatório","tipo":"texto","obrigatorio":true,"placeholder":"Ex: janeiro a junho de 2026"},{"key":"metas","label":"Metas por vendedor","tipo":"textarea","obrigatorio":false,"placeholder":"Ex: Ana R$ 40 mil; Bruno R$ 35 mil"},{"key":"objetivo","label":"Objetivo da análise","tipo":"textarea","obrigatorio":false,"placeholder":"Ex: entender quem precisa de apoio e onde treinar a equipe"}]'::jsonb, 'Atue como gerente comercial sênior e especialista em análise de equipes de vendas.

EMPRESA: {{empresa}}
SEGMENTO: {{segmento}}
PERÍODO: {{periodo}}
METAS POR VENDEDOR: {{metas}}
OBJETIVO: {{objetivo}}

Analise o relatório de vendas anexado.

1. Identifique os vendedores e valide como pedidos são atribuídos.
2. Calcule faturamento, pedidos únicos e ticket médio por vendedor.
3. Calcule atingimento de metas apenas quando elas forem informadas.
4. Faça ranking por faturamento e por atingimento de metas (quando possível).
5. Compare evolução com períodos anteriores quando houver histórico.
6. Verifique diferenças de mix, carteira e concentração de vendas.
7. Calcule conversão somente se existirem dados de leads ou oportunidades.
8. Identifique oportunidades de desenvolvimento por vendedor e para a equipe.
9. Sugira uma rotina semanal de acompanhamento.
10. Estruture treinamentos a partir das evidências observadas.

TABELA 1: VENDEDOR | FATURAMENTO | PEDIDOS | TICKET MÉDIO | META | ATINGIMENTO
TABELA 2: VENDEDOR | PONTO DE ATENÇÃO | AÇÃO | INDICADOR | PRAZO

Inclua cinco descobertas sobre a equipe e três recomendações de gestão.

REGRAS: não atribua desempenho à competência, esforço ou comprometimento sem provas; considere diferenças de carteira, território e oportunidades. Não invente metas, conversões ou números inexistentes.', '', 'users', true, true, 3, 'Preencha os campos e prepare o prompt. Abra o ChatGPT ou o Claude, anexe o relatório de vendas (planilha ou PDF) e cole o prompt na mesma mensagem. Para preservar o contexto, use a mesma conversa das análises anteriores, quando houver. Revise os resultados e remova dados pessoais desnecessários antes de enviar arquivos.', ''),
  ('analisador-04', CURRENT_TIMESTAMP, 'analise-de-clientes', 'analisador-clientes', 'Análise de Clientes', 'Analisar frequência, concentração de receita e recorrência por cliente.', 'Analisar frequência, concentração de receita e recorrência por cliente.', '[{"key":"empresa","label":"Empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"periodo","label":"Período do relatório","tipo":"texto","obrigatorio":true,"placeholder":"Ex: janeiro a junho de 2026"},{"key":"colunaCliente","label":"Coluna que identifica o cliente","tipo":"texto","obrigatorio":false,"placeholder":"Ex: CNPJ, código do cliente","ajuda":"Se não souber, deixe em branco — a IA identifica no arquivo."},{"key":"objetivo","label":"Objetivo","tipo":"textarea","obrigatorio":false,"placeholder":"Ex: descobrir quem compra mais e quem só comprou uma vez"}]'::jsonb, 'Atue como especialista em inteligência comercial, carteira de clientes e relacionamento B2B/B2C.

EMPRESA: {{empresa}}
SEGMENTO: {{segmento}}
PERÍODO: {{periodo}}
IDENTIFICADOR DE CLIENTE: {{colunaCliente}}
OBJETIVO: {{objetivo}}

Analise o relatório anexado.

1. Conte clientes compradores únicos.
2. Calcule faturamento, pedidos e ticket médio por cliente.
3. Identifique recorrentes e compradores de única compra no histórico observado.
4. Calcule concentração de receita nos principais clientes.
5. Compare segmentos, regiões ou tipos de clientes, se houver dados.
6. Identifique oportunidades potenciais de venda complementar.
7. Avalie riscos de dependência de poucos compradores.
8. Recomende ações para fortalecer relacionamento e estimular recompra.
9. Defina prioridades usando critérios explícitos de receita, frequência e recência.
10. Indique quais novos dados ajudariam a melhorar a análise.

ENTREGUE: resumo da carteira; tabela dos dez clientes com maior faturamento (use identificadores não sensíveis); distribuição por frequência de compra; riscos; oportunidades; cinco ações comerciais.

REGRAS: potencial não significa rentabilidade comprovada; não infira satisfação apenas pelo histórico de compra; não exponha dados pessoais desnecessários; não invente informações ausentes.', '', 'user-search', true, true, 4, 'Preencha os campos e prepare o prompt. Abra o ChatGPT ou o Claude, anexe o relatório de vendas (planilha ou PDF) e cole o prompt na mesma mensagem. Para preservar o contexto, use a mesma conversa das análises anteriores, quando houver. Revise os resultados e remova dados pessoais desnecessários antes de enviar arquivos.', ''),
  ('analisador-05', CURRENT_TIMESTAMP, 'analise-de-produtos-e-mix-de-vendas', 'analisador-produtos', 'Análise de Produtos e Mix de Vendas', 'Avaliar produtos, categorias e oportunidades de venda complementar.', 'Avaliar produtos, categorias e oportunidades de venda complementar.', '[{"key":"empresa","label":"Empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"periodo","label":"Período do relatório","tipo":"texto","obrigatorio":true,"placeholder":"Ex: janeiro a junho de 2026"},{"key":"categorias","label":"Categorias de produto","tipo":"texto","obrigatorio":false,"placeholder":"Ex: lavagem, estética, acessórios"},{"key":"objetivo","label":"Objetivo","tipo":"textarea","obrigatorio":false,"placeholder":"Ex: saber quais produtos puxam as vendas e o que vender junto"}]'::jsonb, 'Atue como especialista em gestão comercial, análise de portfólio e inteligência de produtos.

EMPRESA: {{empresa}}
SEGMENTO: {{segmento}}
PERÍODO: {{periodo}}
CATEGORIAS: {{categorias}}
OBJETIVO: {{objetivo}}

Analise o relatório de vendas anexado.

1. Valide códigos, descrições, unidades de medida e categorias.
2. Calcule faturamento por produto e categoria.
3. Calcule quantidades respeitando unidades de medida.
4. Identifique dez produtos de maior faturamento e dez de maior volume.
5. Calcule participação percentual de cada categoria.
6. Compare evolução dos principais produtos quando houver períodos comparáveis.
7. Identifique produtos que perderam participação.
8. Identifique possíveis combinações de cross-sell com base em itens comprados juntos, quando existirem IDs de pedido.
9. Sugira ações de divulgação e melhorias no portfólio.
10. Crie três campanhas comerciais para testar e um plano de 15 dias.

TABELA A: PRODUTO | QUANTIDADE | FATURAMENTO | PARTICIPAÇÃO %
TABELA B: CATEGORIA | FATURAMENTO | PARTICIPAÇÃO | EVOLUÇÃO

Inclua cinco descobertas relevantes.

REGRAS: volume não é receita nem margem; não presuma excesso de estoque sem dados de estoque; não conclua rentabilidade sem custo; trate cancelamentos e duplicidades corretamente.', '', 'cart', true, true, 5, 'Preencha os campos e prepare o prompt. Abra o ChatGPT ou o Claude, anexe o relatório de vendas (planilha ou PDF) e cole o prompt na mesma mensagem. Para preservar o contexto, use a mesma conversa das análises anteriores, quando houver. Revise os resultados e remova dados pessoais desnecessários antes de enviar arquivos.', ''),
  ('analisador-06', CURRENT_TIMESTAMP, 'identificacao-de-clientes-inativos', 'analisador-clientes', 'Identificação de Clientes Inativos', 'Encontrar clientes sem recompra e preparar campanhas de reativação.', 'Encontrar clientes sem recompra e preparar campanhas de reativação.', '[{"key":"empresa","label":"Empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"dataRef","label":"Data de referência","tipo":"texto","obrigatorio":true,"placeholder":"Ex: 30/10/2026"},{"key":"criterio","label":"Critério de inatividade","tipo":"texto","obrigatorio":true,"placeholder":"Ex: 90 dias sem comprar"},{"key":"periodo","label":"Período do histórico","tipo":"texto","obrigatorio":true,"placeholder":"Ex: janeiro de 2025 a outubro de 2026"},{"key":"objetivo","label":"Objetivo","tipo":"textarea","obrigatorio":false,"placeholder":"Ex: trazer de volta clientes que sumiram"}]'::jsonb, 'Atue como especialista em CRM, retenção, recompra e recuperação de carteira comercial.

EMPRESA: {{empresa}}
SEGMENTO: {{segmento}}
DATA DE REFERÊNCIA: {{dataRef}}
CRITÉRIO DE INATIVIDADE: {{criterio}}
PERÍODO DO HISTÓRICO: {{periodo}}
OBJETIVO: {{objetivo}}

Analise o histórico de vendas anexado.

ETAPA 1: verifique identificador de cliente, datas, valores e se a extensão do histórico permite aplicar o critério escolhido.

ETAPA 2:
1. Calcule última compra e dias desde a última compra por cliente.
2. Classifique a situação de cada cliente com base no critério informado.
3. Calcule faturamento histórico, quantidade e frequência de compras.
4. Identifique os produtos anteriormente adquiridos.
5. Agrupe clientes por prioridade e padrão de compra.
6. Separe alto valor histórico de baixa recorrência.
7. Quantifique a carteira elegível para ação.
8. Aponte oportunidades de reativação como hipóteses.

ETAPA 3: crie estratégia por segmento, três mensagens de WhatsApp por perfil, cadência de contato respeitosa, plano de sete dias e indicadores (resposta, recompra, receita efetivamente recuperada).

TABELA: CLIENTE | ÚLTIMA COMPRA | DIAS INATIVO | COMPRAS | RECEITA HISTÓRICA | PRIORIDADE

REGRAS: não marque como inativo sem histórico suficiente; não trate receita anterior como receita recuperável garantida; não invente contatos, descontos ou preferências. Respeite bases legais e solicitações de não contato.', '', 'clock', true, true, 6, 'Preencha os campos e prepare o prompt. Abra o ChatGPT ou o Claude, anexe o relatório de vendas (planilha ou PDF) e cole o prompt na mesma mensagem. Para preservar o contexto, use a mesma conversa das análises anteriores, quando houver. Revise os resultados e remova dados pessoais desnecessários antes de enviar arquivos.', ''),
  ('analisador-07', CURRENT_TIMESTAMP, 'curva-abc-de-clientes-e-produtos', 'analisador-clientes', 'Curva ABC de Clientes e Produtos', 'Classificar concentração de faturamento e prioridades comerciais.', 'Classificar concentração de faturamento e prioridades comerciais.', '[{"key":"empresa","label":"Empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"periodo","label":"Período do relatório","tipo":"texto","obrigatorio":true,"placeholder":"Ex: janeiro a junho de 2026"},{"key":"tipo","label":"Tipo de análise","tipo":"select","opcoes":["Clientes","Produtos","Ambos"],"obrigatorio":true},{"key":"criterio","label":"Critério","tipo":"select","opcoes":["Faturamento","Margem (se o relatório tiver custo)"],"obrigatorio":false,"ajuda":"Sem escolher, a IA usa faturamento."}]'::jsonb, 'Atue como analista de inteligência comercial especializado em classificação ABC.

EMPRESA: {{empresa}}
SEGMENTO: {{segmento}}
PERÍODO: {{periodo}}
TIPO DE ANÁLISE: {{tipo}}
CRITÉRIO: {{criterio}}

Analise o relatório anexado.

1. Verifique identificadores e estrutura das linhas.
2. Agregue receita corretamente por cliente e por produto conforme solicitado.
3. Ordene da maior contribuição para a menor.
4. Calcule participação percentual e percentual acumulado.
5. Classifique A/B/C com limites iniciais de 80%, 95% e 100% de participação acumulada e explicite o tratamento de itens na fronteira.
6. Quantifique clientes/produtos por classe.
7. Identifique concentração de faturamento e riscos.
8. Recomende estratégias comerciais por classe.
9. Aponte oportunidades para investigar.
10. Crie cinco ações para 30 dias.

TABELA CLIENTES: CLIENTE | FATURAMENTO | PARTICIPAÇÃO % | ACUMULADO % | CLASSE
TABELA PRODUTOS: PRODUTO | FATURAMENTO | PARTICIPAÇÃO % | ACUMULADO % | CLASSE

REGRAS: curva ABC de receita não prova lucro; produtos C não devem ser descartados automaticamente; clientes A não são necessariamente os mais rentáveis. Verifique devoluções e duplicidades.', '', 'bar-chart', true, true, 7, 'Preencha os campos e prepare o prompt. Abra o ChatGPT ou o Claude, anexe o relatório de vendas (planilha ou PDF) e cole o prompt na mesma mensagem. Para preservar o contexto, use a mesma conversa das análises anteriores, quando houver. Revise os resultados e remova dados pessoais desnecessários antes de enviar arquivos.', ''),
  ('analisador-08', CURRENT_TIMESTAMP, 'analise-de-margens-e-rentabilidade', 'analisador-produtos', 'Análise de Margens e Rentabilidade', 'Avaliar contribuição financeira de produtos, categorias e descontos.', 'Avaliar contribuição financeira de produtos, categorias e descontos.', '[{"key":"empresa","label":"Empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"periodo","label":"Período do relatório","tipo":"texto","obrigatorio":true,"placeholder":"Ex: janeiro a junho de 2026"},{"key":"fonteCustos","label":"Onde estão os custos","tipo":"texto","obrigatorio":true,"placeholder":"Ex: planilha de custos anexada / coluna \"Custo unitário\""},{"key":"tributos","label":"Tributos e taxas variáveis","tipo":"texto","obrigatorio":false,"placeholder":"Ex: Simples 6%; taxa do cartão 3,5%"},{"key":"comissoes","label":"Comissões","tipo":"texto","obrigatorio":false,"placeholder":"Ex: 5% sobre a venda"},{"key":"objetivo","label":"Objetivo","tipo":"textarea","obrigatorio":false,"placeholder":"Ex: descobrir quais produtos dão mais lucro e onde o desconto está pesando"}]'::jsonb, 'Atue como consultor financeiro-comercial especializado em precificação, margem de contribuição e rentabilidade.

EMPRESA: {{empresa}}
SEGMENTO: {{segmento}}
PERÍODO: {{periodo}}
FONTE DE CUSTOS: {{fonteCustos}}
TRIBUTOS/TAXAS VARIÁVEIS: {{tributos}}
COMISSÕES: {{comissoes}}
OBJETIVO: {{objetivo}}

Analise os relatórios de vendas e custos anexados.

1. Valide vendas realizadas, descontos, devoluções, unidades e custos correspondentes.
2. Confira se os custos pertencem ao período correto.
3. Distinga custos variáveis de despesas fixas.
4. Calcule receita líquida das deduções disponíveis.
5. Calcule custos variáveis, margem de contribuição em R$ e %.
6. Compare produtos, categorias e clientes quando houver dados suficientes.
7. Analise efeito de descontos na margem.
8. Identifique itens com maior e menor contribuição financeira.
9. Aponte problemas de precificação a investigar.
10. Recomende cinco ações viáveis para melhorar a margem.

TABELA: PRODUTO | RECEITA | CUSTOS VARIÁVEIS | MARGEM R$ | MARGEM % | OBSERVAÇÃO

Entregue resumo executivo, fórmulas, limitações e plano de ação.

REGRAS: não confunda margem bruta, contribuição e lucro líquido. Não invente custos, alíquotas ou despesas. Sem custo suficiente, não calcule margens fictícias; apresente apenas análise parcial e dados faltantes.', '', 'wallet', true, true, 8, 'Preencha os campos e prepare o prompt. Abra o ChatGPT ou o Claude, anexe o relatório de vendas (planilha ou PDF) e cole o prompt na mesma mensagem. Para preservar o contexto, use a mesma conversa das análises anteriores, quando houver. Revise os resultados e remova dados pessoais desnecessários antes de enviar arquivos.', ''),
  ('analisador-09', CURRENT_TIMESTAMP, 'analise-de-metas-e-projecoes', 'analisador-visao-geral', 'Análise de Metas e Projeções', 'Avaliar ritmo de metas e construir cenários comerciais.', 'Avaliar ritmo de metas e construir cenários comerciais.', '[{"key":"empresa","label":"Empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"periodo","label":"Período da meta","tipo":"texto","obrigatorio":true,"placeholder":"Ex: novembro de 2026"},{"key":"meta","label":"Meta de faturamento","tipo":"texto","obrigatorio":true,"placeholder":"Ex: R$ 80 mil"},{"key":"metasVendedor","label":"Metas por vendedor","tipo":"textarea","obrigatorio":false,"placeholder":"Ex: Ana R$ 30 mil; Bruno R$ 25 mil"},{"key":"dataRef","label":"Data de referência","tipo":"texto","obrigatorio":true,"placeholder":"Ex: 15/11/2026"},{"key":"diasComerciais","label":"Dias comerciais","tipo":"texto","obrigatorio":true,"placeholder":"Ex: 21 dias úteis, de segunda a sábado"},{"key":"objetivo","label":"Objetivo","tipo":"textarea","obrigatorio":false,"placeholder":"Ex: saber se vamos bater a meta e o que fazer até o fim do mês"}]'::jsonb, 'Atue como consultor de planejamento comercial especializado em metas e indicadores.

EMPRESA: {{empresa}}
SEGMENTO: {{segmento}}
PERÍODO DA META: {{periodo}}
META DE FATURAMENTO: {{meta}}
METAS POR VENDEDOR: {{metasVendedor}}
DATA DE REFERÊNCIA: {{dataRef}}
DIAS COMERCIAIS: {{diasComerciais}}
OBJETIVO: {{objetivo}}

Analise o relatório de vendas anexado.

1. Calcule faturamento acumulado e percentual de meta atingida.
2. Calcule valor restante para a meta.
3. Identifique dias comerciais transcorridos e restantes.
4. Calcule média por dia comercial já transcorrido.
5. Calcule média diária necessária para cumprir a meta.
6. Compare ritmo atual e necessário.
7. Avalie vendedores individualmente quando houver metas específicas.
8. Prepare três cenários (manutenção do ritmo, inferior e superior), com premissas explícitas.
9. Explique riscos e limitações de cada projeção.
10. Proponha cinco ações e indicadores para acompanhar o restante do período.

TABELA GERAL: META | REALIZADO | ATINGIMENTO % | RESTANTE | DIAS RESTANTES | MÉDIA NECESSÁRIA
TABELA VENDEDOR: VENDEDOR | META | REALIZADO | ATINGIMENTO | RESTANTE

REGRAS: cenário não é garantia. Não invente calendário, dias úteis, metas ou faturamento. Explicite premissas quando os dados não permitirem estimativas precisas.', '', 'goal', true, true, 9, 'Preencha os campos e prepare o prompt. Abra o ChatGPT ou o Claude, anexe o relatório de vendas (planilha ou PDF) e cole o prompt na mesma mensagem. Para preservar o contexto, use a mesma conversa das análises anteriores, quando houver. Revise os resultados e remova dados pessoais desnecessários antes de enviar arquivos.', ''),
  ('analisador-10', CURRENT_TIMESTAMP, 'plano-de-acao-comercial-de-30-dias', 'analisador-equipe-acao', 'Plano de Ação Comercial de 30 Dias', 'Converter diagnósticos em prioridades, ações e acompanhamento.', 'Converter diagnósticos em prioridades, ações e acompanhamento.', '[{"key":"empresa","label":"Empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"objetivo","label":"Objetivo principal","tipo":"textarea","obrigatorio":true,"perfil":"objetivos"},{"key":"dificuldade","label":"Maior dificuldade","tipo":"textarea","obrigatorio":true,"placeholder":"Ex: muitos orçamentos e poucos fechamentos"},{"key":"equipe","label":"Equipe disponível","tipo":"texto","obrigatorio":false,"placeholder":"Ex: eu e 2 vendedores"},{"key":"recursos","label":"Orçamento e recursos","tipo":"texto","obrigatorio":false,"placeholder":"Ex: R$ 2 mil por mês, CRM e WhatsApp Business"},{"key":"periodo","label":"Período do plano","tipo":"texto","obrigatorio":true,"placeholder":"Ex: 01/11/2026 a 30/11/2026"}]'::jsonb, 'Atue como diretor comercial e consultor sênior de crescimento de PMEs.

EMPRESA: {{empresa}}
SEGMENTO: {{segmento}}
OBJETIVO PRINCIPAL: {{objetivo}}
MAIOR DIFICULDADE: {{dificuldade}}
EQUIPE DISPONÍVEL: {{equipe}}
ORÇAMENTO/RECURSOS: {{recursos}}
PERÍODO DO PLANO: {{periodo}}

Use o relatório anexado e as análises anteriores que estiverem efetivamente disponíveis nesta mesma conversa. Se não houver análises anteriores, use apenas os arquivos presentes e não presuma diagnósticos inexistentes.

ETAPA 1 — DIAGNÓSTICO
1. Resuma cinco achados sustentados por números.
2. Identifique gargalos, riscos e oportunidades.
3. Separe problemas comprovados de hipóteses.
4. Informe limitações dos dados.

ETAPA 2 — PRIORIZAÇÃO
Classifique ações por impacto potencial, facilidade, custo, prazo, dependências e força das evidências.

ETAPA 3 — CRONOGRAMA DE 30 DIAS
- Semana 1: organizar dados e corrigir falhas prioritárias.
- Semana 2: executar melhorias em atendimento, negociação, carteira ou mix conforme o diagnóstico.
- Semana 3: recuperar oportunidades e desenvolver ações comerciais.
- Semana 4: medir resultados, corrigir desvios e planejar o próximo ciclo.

ETAPA 4 — TABELA OPERACIONAL
AÇÃO | PROBLEMA | RESPONSÁVEL SUGERIDO | PRAZO | INDICADOR | PRIORIDADE | CRITÉRIO DE SUCESSO

ETAPA 5 — ACOMPANHAMENTO
Forneça roteiro de reunião semanal de 20 minutos, checklist diário, cinco indicadores, modelo de prestação de contas e revisão ao final de 30 dias.

FORMATO: resumo executivo; objetivos; prioridades; cronograma; tabela de ações; indicadores; checklist; próximas decisões.

REGRAS: não invente resultados, oportunidades financeiras ou metas numéricas sem identificá-las como propostas. Não recomende ações incompatíveis com equipe e orçamento. Diferencie resultado esperado de previsão comprovada.', '', 'map', true, true, 10, 'Preencha os campos e prepare o prompt. Abra o ChatGPT ou o Claude, anexe o relatório de vendas (planilha ou PDF) e cole o prompt na mesma mensagem. Para preservar o contexto, use a mesma conversa das análises anteriores, quando houver. Revise os resultados e remova dados pessoais desnecessários antes de enviar arquivos.', '')
ON CONFLICT ("slug") DO NOTHING;
