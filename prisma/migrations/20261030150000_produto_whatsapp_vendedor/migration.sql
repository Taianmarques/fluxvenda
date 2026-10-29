-- Produto 03 — WhatsApp Vendedor: 8 módulos e os 50 prompts oficiais. Texto mantido como veio; os
-- campos entre colchetes viram formulário e cada item de "Informações específicas" vira um campo
-- próprio (a linha leva o nome do item antes do valor). Prompts com regras próprias → sem as regras
-- gerais de qualidade.
UPDATE "InfoProduto" SET "regrasQualidade" = false, "publicado" = true,
  "descricao" = '50 prompts para criar mensagens de WhatsApp personalizadas com os dados do seu negócio: abordagem, qualificação, orçamento, negociação, objeções, follow-up, fechamento e pós-venda.'
WHERE "id" = 'produto-whatsapp-vendedor';

INSERT INTO "CentralModulo" ("id", "numero", "nome", "descricao", "icone", "produtoId") VALUES
  ('whatsapp-abordagem', 15, 'Abordagem inicial', 'Primeiro contato com leads de anúncio, indicação, formulário, loja e B2B.', 'send', 'produto-whatsapp-vendedor'),
  ('whatsapp-qualificacao', 16, 'Qualificação', 'Descubra necessidade, urgência, orçamento e quem decide.', 'filter', 'produto-whatsapp-vendedor'),
  ('whatsapp-orcamentos', 17, 'Orçamentos e propostas', 'Envie, explique e acompanhe orçamentos com clareza.', 'file-text', 'produto-whatsapp-vendedor'),
  ('whatsapp-negociacao', 18, 'Negociação', 'Escopo, prazo, pagamento e volume sem dar desconto à toa.', 'handshake', 'produto-whatsapp-vendedor'),
  ('whatsapp-objecoes', 19, 'Objeções', 'Respostas para preço, "vou pensar", desconto, confiança e sócio.', 'shield', 'produto-whatsapp-vendedor'),
  ('whatsapp-follow-up', 20, 'Follow-up e recuperação', 'Retome propostas e conversas paradas sem insistir.', 'repeat', 'produto-whatsapp-vendedor'),
  ('whatsapp-fechamento', 21, 'Fechamento', 'Peça a decisão, confirme o pedido e oriente o pagamento.', 'thumbs-up', 'produto-whatsapp-vendedor'),
  ('whatsapp-pos-venda', 22, 'Pós-venda e recompra', 'Agradeça, peça avaliação e traga o cliente de volta.', 'heart', 'produto-whatsapp-vendedor')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CentralFerramenta" ("id", "updatedAt", "slug", "moduloId", "nome", "descricao", "objetivo", "campos", "prompt", "instrucoes", "icone", "publicada", "permitirCopiarPrompt", "ordem", "comoUsar", "formatoResposta") VALUES
  ('whatsapp-01', CURRENT_TIMESTAMP, 'primeiro-contato-com-lead-de-anuncio', 'whatsapp-abordagem', 'Primeiro contato com lead de anúncio', 'Um lead chegou de anúncio e ainda não explicou sua necessidade.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Origem do anúncio","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Produto anunciado","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Cta","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Horários de atendimento","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Primeiro contato com lead de anúncio.
- Situação: Um lead chegou de anúncio e ainda não explicou sua necessidade.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Origem do anúncio: {{info1}}; Produto anunciado: {{info2}}; Cta: {{info3}}; Horários de atendimento: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Crie abertura contextual sem assumir interesse confirmado; convide a pessoa a contar sua necessidade.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'send', true, true, 1, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-02', CURRENT_TIMESTAMP, 'primeiro-contato-por-indicacao', 'whatsapp-abordagem', 'Primeiro contato por indicação', 'A pessoa foi indicada por cliente ou parceiro.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Nome do indicador autorizado","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Vínculo","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Produto","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Contexto da indicação","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Primeiro contato por indicação.
- Situação: A pessoa foi indicada por cliente ou parceiro.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Nome do indicador autorizado: {{info1}}; Vínculo: {{info2}}; Produto: {{info3}}; Contexto da indicação: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Mencione a indicação apenas com autorização e proponha uma conversa natural.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'send', true, true, 2, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-03', CURRENT_TIMESTAMP, 'resposta-a-pedido-de-preco', 'whatsapp-abordagem', 'Resposta a pedido de preço', 'O primeiro contato é apenas “quanto custa?”.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Produto","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Variações","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Preço confirmado ou política de orçamento","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Fatores de preço","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Resposta a pedido de preço.
- Situação: O primeiro contato é apenas “quanto custa?”.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Produto: {{info1}}; Variações: {{info2}}; Preço confirmado ou política de orçamento: {{info3}}; Fatores de preço: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Responda diretamente ao preço quando disponível e faça no máximo uma pergunta útil.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'send', true, true, 3, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-04', CURRENT_TIMESTAMP, 'abordagem-apos-formulario', 'whatsapp-abordagem', 'Abordagem após formulário', 'O contato preencheu formulário e aguarda retorno.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Campos fornecidos","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Produto","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Consentimento para contato","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Objetivo","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Abordagem após formulário.
- Situação: O contato preencheu formulário e aguarda retorno.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Campos fornecidos: {{info1}}; Produto: {{info2}}; Consentimento para contato: {{info3}}; Objetivo: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Reconheça o preenchimento sem repetir dados sensíveis e proponha próximo passo.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'send', true, true, 4, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-05', CURRENT_TIMESTAMP, 'abordagem-para-cliente-de-loja-fisica', 'whatsapp-abordagem', 'Abordagem para cliente de loja física', 'A pessoa visitou a loja e permitiu contato posterior.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Produto visto","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Dia da visita","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Autorização","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Próximo passo combinado","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Abordagem para cliente de loja física.
- Situação: A pessoa visitou a loja e permitiu contato posterior.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Produto visto: {{info1}}; Dia da visita: {{info2}}; Autorização: {{info3}}; Próximo passo combinado: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Reative a conversa com contexto da visita e sem insistência.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'send', true, true, 5, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-06', CURRENT_TIMESTAMP, 'mensagem-para-solicitacao-fora-do-horario', 'whatsapp-abordagem', 'Mensagem para solicitação fora do horário', 'O cliente escreveu fora do expediente.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Horário real","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Canal","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Prazo realista","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Informação que pode adiantar","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Mensagem para solicitação fora do horário.
- Situação: O cliente escreveu fora do expediente.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Horário real: {{info1}}; Canal: {{info2}}; Prazo realista: {{info3}}; Informação que pode adiantar: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Prepare resposta que reconheça a mensagem sem prometer retorno imediato se não houver garantia.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'send', true, true, 6, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-07', CURRENT_TIMESTAMP, 'abordagem-b2b-para-empresa-interessada', 'whatsapp-abordagem', 'Abordagem B2B para empresa interessada', 'Contato empresarial solicitou informações comerciais.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Setor","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Porte","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Necessidade","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Produto","tipo":"texto","obrigatorio":false},{"key":"info5","label":"Dados de compra conhecidos","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Abordagem B2B para empresa interessada.
- Situação: Contato empresarial solicitou informações comerciais.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Setor: {{info1}}; Porte: {{info2}}; Necessidade: {{info3}}; Produto: {{info4}}; Dados de compra conhecidos: {{info5}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Crie abertura profissional com pergunta de diagnóstico e convite a próxima etapa.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'send', true, true, 7, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-08', CURRENT_TIMESTAMP, 'descobrir-a-necessidade-principal', 'whatsapp-qualificacao', 'Descobrir a necessidade principal', 'Cliente ainda não definiu exatamente o que procura.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Produto","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Possibilidades","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Contexto inicial","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Descobrir a necessidade principal.
- Situação: Cliente ainda não definiu exatamente o que procura.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Produto: {{info1}}; Possibilidades: {{info2}}; Contexto inicial: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Crie sequência de até três perguntas abertas para entender a aplicação.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'filter', true, true, 8, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-09', CURRENT_TIMESTAMP, 'qualificar-urgencia-sem-pressionar', 'whatsapp-qualificacao', 'Qualificar urgência sem pressionar', 'Entender prazo real da necessidade.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Prazo de entrega","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Disponibilidade comprovada","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Data do projeto","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Qualificar urgência sem pressionar.
- Situação: Entender prazo real da necessidade.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Prazo de entrega: {{info1}}; Disponibilidade comprovada: {{info2}}; Data do projeto: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Pergunte prazo desejado e consequência operacional, sem forçar urgência artificial.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'filter', true, true, 9, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-10', CURRENT_TIMESTAMP, 'qualificar-orcamento-disponivel', 'whatsapp-qualificacao', 'Qualificar orçamento disponível', 'Entender faixa de investimento de maneira respeitosa.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Faixas reais de preço","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Opções disponíveis","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Contexto","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Qualificar orçamento disponível.
- Situação: Entender faixa de investimento de maneira respeitosa.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Faixas reais de preço: {{info1}}; Opções disponíveis: {{info2}}; Contexto: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Pergunte referência de investimento sem constranger e ofereça caminhos.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'filter', true, true, 10, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-11', CURRENT_TIMESTAMP, 'qualificar-decisao-e-envolvidos', 'whatsapp-qualificacao', 'Qualificar decisão e envolvidos', 'Em uma compra B2B há mais decisores.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Papel do interlocutor","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Fluxo de aprovação","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Proposta","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Qualificar decisão e envolvidos.
- Situação: Em uma compra B2B há mais decisores.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Papel do interlocutor: {{info1}}; Fluxo de aprovação: {{info2}}; Proposta: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Entenda como ocorre a decisão sem questionar autoridade de forma ríspida.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'filter', true, true, 11, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-12', CURRENT_TIMESTAMP, 'qualificar-projeto-e-medidas', 'whatsapp-qualificacao', 'Qualificar projeto e medidas', 'Produtos sob medida precisam de dados técnicos.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Medidas","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Ambiente","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Projeto","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Material","tipo":"texto","obrigatorio":false},{"key":"info5","label":"Informações mínimas","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Qualificar projeto e medidas.
- Situação: Produtos sob medida precisam de dados técnicos.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Medidas: {{info1}}; Ambiente: {{info2}}; Projeto: {{info3}}; Material: {{info4}}; Informações mínimas: {{info5}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Solicite dimensões e arquivos necessários, sem inventar especificações.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'filter', true, true, 12, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-13', CURRENT_TIMESTAMP, 'encaminhar-lead-ao-vendedor-certo', 'whatsapp-qualificacao', 'Encaminhar lead ao vendedor certo', 'Transferência do atendimento para especialista.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Responsável","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Área","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Dados já coletados","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Próximo passo","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Encaminhar lead ao vendedor certo.
- Situação: Transferência do atendimento para especialista.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Responsável: {{info1}}; Área: {{info2}}; Dados já coletados: {{info3}}; Próximo passo: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Crie transição cordial, resumindo somente informações necessárias e sem garantir disponibilidade não confirmada.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'filter', true, true, 13, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-14', CURRENT_TIMESTAMP, 'confirmar-recebimento-do-orcamento', 'whatsapp-orcamentos', 'Confirmar recebimento do orçamento', 'Orçamento já foi enviado.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Data","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Item","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Canal","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Validade real","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Confirmar recebimento do orçamento.
- Situação: Orçamento já foi enviado.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Data: {{info1}}; Item: {{info2}}; Canal: {{info3}}; Validade real: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Pergunte se a proposta chegou e facilite dúvidas sem pressão.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'file-text', true, true, 14, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-15', CURRENT_TIMESTAMP, 'apresentar-orcamento-com-valor', 'whatsapp-orcamentos', 'Apresentar orçamento com valor', 'Enviar preço com justificativa de benefícios.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Itens","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Valor","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Condições verdadeiras","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Diferencial comprovado","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Apresentar orçamento com valor.
- Situação: Enviar preço com justificativa de benefícios.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Itens: {{info1}}; Valor: {{info2}}; Condições verdadeiras: {{info3}}; Diferencial comprovado: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Comunique preço e escopo com clareza, mostrando o que está incluído.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'file-text', true, true, 15, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-16', CURRENT_TIMESTAMP, 'solicitar-dados-para-orcamento', 'whatsapp-orcamentos', 'Solicitar dados para orçamento', 'Orçamento não pode ser elaborado sem informações.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Dados essenciais","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Tipo de solução","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Prazo estimado se validado","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Solicitar dados para orçamento.
- Situação: Orçamento não pode ser elaborado sem informações.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Dados essenciais: {{info1}}; Tipo de solução: {{info2}}; Prazo estimado se validado: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Solicite somente dados mínimos e explique para que servem.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'file-text', true, true, 16, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-17', CURRENT_TIMESTAMP, 'explicar-opcoes-de-orcamento', 'whatsapp-orcamentos', 'Explicar opções de orçamento', 'Existem versões com escopos diferentes.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Opção a e b","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Valores","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Diferenças","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Restrições","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Explicar opções de orçamento.
- Situação: Existem versões com escopos diferentes.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Opção a e b: {{info1}}; Valores: {{info2}}; Diferenças: {{info3}}; Restrições: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Compare alternativas sem desmerecer opção mais barata.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'file-text', true, true, 17, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-18', CURRENT_TIMESTAMP, 'enviar-orcamento-revisado', 'whatsapp-orcamentos', 'Enviar orçamento revisado', 'Proposta foi atualizada após conversa.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Alterações","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Valor novo","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Número de versão","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Prazo","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Enviar orçamento revisado.
- Situação: Proposta foi atualizada após conversa.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Alterações: {{info1}}; Valor novo: {{info2}}; Número de versão: {{info3}}; Prazo: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Evidencie o que mudou e peça confirmação dos ajustes.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'file-text', true, true, 18, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-19', CURRENT_TIMESTAMP, 'reforcar-diferenciais-apos-proposta', 'whatsapp-orcamentos', 'Reforçar diferenciais após proposta', 'Cliente conhece o preço mas não percebe valor.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Proposta","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Benefício","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Prova disponível","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Garantia real","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Reforçar diferenciais após proposta.
- Situação: Cliente conhece o preço mas não percebe valor.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Proposta: {{info1}}; Benefício: {{info2}}; Prova disponível: {{info3}}; Garantia real: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Apresente até três diferenciais verificáveis sem inventar depoimentos.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'file-text', true, true, 19, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-20', CURRENT_TIMESTAMP, 'solicitar-retorno-sobre-proposta', 'whatsapp-orcamentos', 'Solicitar retorno sobre proposta', 'Proposta em avaliação.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Data do envio","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Próximo marco","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Contato prévio","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Solicitar retorno sobre proposta.
- Situação: Proposta em avaliação.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Data do envio: {{info1}}; Próximo marco: {{info2}}; Contato prévio: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Faça pergunta objetiva sobre dúvidas e etapa da decisão, evitando cobrança.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'file-text', true, true, 20, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-21', CURRENT_TIMESTAMP, 'negociar-escopo-sem-desconto', 'whatsapp-negociacao', 'Negociar escopo sem desconto', 'Cliente quer reduzir preço.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Escopo","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Custos","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Alternativas aprovadas","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Negociar escopo sem desconto.
- Situação: Cliente quer reduzir preço.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Escopo: {{info1}}; Custos: {{info2}}; Alternativas aprovadas: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Proponha ajuste de escopo ou condições existentes sem conceder descontos não autorizados.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'handshake', true, true, 21, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-22', CURRENT_TIMESTAMP, 'negociar-prazo-de-entrega', 'whatsapp-negociacao', 'Negociar prazo de entrega', 'Cliente exige prazo diferente.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Prazo real","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Capacidade","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Alternativas confirmadas","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Negociar prazo de entrega.
- Situação: Cliente exige prazo diferente.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Prazo real: {{info1}}; Capacidade: {{info2}}; Alternativas confirmadas: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Explique viabilidade e ofereça caminho realista sem prometer o impossível.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'handshake', true, true, 22, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-23', CURRENT_TIMESTAMP, 'comparar-com-concorrente', 'whatsapp-negociacao', 'Comparar com concorrente', 'Cliente apresentou outra proposta.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Diferenças comprovadas","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Escopo","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Condições","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Comparar com concorrente.
- Situação: Cliente apresentou outra proposta.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Diferenças comprovadas: {{info1}}; Escopo: {{info2}}; Condições: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Proponha comparação justa de escopo, materiais e serviços sem alegações sobre o concorrente.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'handshake', true, true, 23, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-24', CURRENT_TIMESTAMP, 'negociar-condicoes-de-pagamento', 'whatsapp-negociacao', 'Negociar condições de pagamento', 'Cliente quer parcelar ou alterar pagamento.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Condições permitidas","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Taxas","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Entrada","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Aprovação","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Negociar condições de pagamento.
- Situação: Cliente quer parcelar ou alterar pagamento.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Condições permitidas: {{info1}}; Taxas: {{info2}}; Entrada: {{info3}}; Aprovação: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Mostre somente condições autorizadas e convide a escolher alternativa.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'handshake', true, true, 24, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-25', CURRENT_TIMESTAMP, 'negociar-pedido-de-maior-volume', 'whatsapp-negociacao', 'Negociar pedido de maior volume', 'Cliente deseja preço por quantidade.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Quantidade","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Política comercial","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Mínimo","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Margem","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Negociar pedido de maior volume.
- Situação: Cliente deseja preço por quantidade.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Quantidade: {{info1}}; Política comercial: {{info2}}; Mínimo: {{info3}}; Margem: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Apresente critérios comerciais reais sem supor desconto por volume.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'handshake', true, true, 25, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-26', CURRENT_TIMESTAMP, 'alinhar-expectativas-antes-de-fechar', 'whatsapp-negociacao', 'Alinhar expectativas antes de fechar', 'Há dúvidas de entrega, instalação ou suporte.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Escopo","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Inclusões e exclusões","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Prazo","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Pós-venda","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Alinhar expectativas antes de fechar.
- Situação: Há dúvidas de entrega, instalação ou suporte.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Escopo: {{info1}}; Inclusões e exclusões: {{info2}}; Prazo: {{info3}}; Pós-venda: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Resuma o combinado e solicite confirmação para evitar ruídos.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'handshake', true, true, 26, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-27', CURRENT_TIMESTAMP, 'cliente-disse-esta-caro', 'whatsapp-objecoes', 'Cliente disse está caro', 'Objeção de preço explícita.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Preço","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Escopo","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Alternativas reais","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Diferencial","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Cliente disse está caro.
- Situação: Objeção de preço explícita.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Preço: {{info1}}; Escopo: {{info2}}; Alternativas reais: {{info3}}; Diferencial: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Valide preocupação, investigue referência e explique valor sem pressão.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'shield', true, true, 27, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-28', CURRENT_TIMESTAMP, 'cliente-disse-vou-pensar', 'whatsapp-objecoes', 'Cliente disse vou pensar', 'Cliente adiou decisão.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Proposta","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Data","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Assunto em aberto","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Cliente disse vou pensar.
- Situação: Cliente adiou decisão.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Proposta: {{info1}}; Data: {{info2}}; Assunto em aberto: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Pergunte o que precisa avaliar e combine um retorno apenas se ele aceitar.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'shield', true, true, 28, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-29', CURRENT_TIMESTAMP, 'cliente-pediu-desconto', 'whatsapp-objecoes', 'Cliente pediu desconto', 'Pedido direto de redução de preço.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Política de desconto","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Contrapartidas permitidas","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Cliente pediu desconto.
- Situação: Pedido direto de redução de preço.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Política de desconto: {{info1}}; Contrapartidas permitidas: {{info2}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Responda sem inventar concessões e apresente alternativas permitidas.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'shield', true, true, 29, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-30', CURRENT_TIMESTAMP, 'cliente-nao-confia-na-empresa', 'whatsapp-objecoes', 'Cliente não confia na empresa', 'Dúvidas de credibilidade.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Portfólio","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Avaliações autorizadas","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Política","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Documentos","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Cliente não confia na empresa.
- Situação: Dúvidas de credibilidade.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Portfólio: {{info1}}; Avaliações autorizadas: {{info2}}; Política: {{info3}}; Documentos: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Oriente a mostrar provas verificáveis, sem fabricar avaliações.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'shield', true, true, 30, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-31', CURRENT_TIMESTAMP, 'cliente-teme-escolher-errado', 'whatsapp-objecoes', 'Cliente teme escolher errado', 'Receio de arrependimento.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Especificações","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Política de troca","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Aplicação","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Cliente teme escolher errado.
- Situação: Receio de arrependimento.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Especificações: {{info1}}; Política de troca: {{info2}}; Aplicação: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Ajude a avaliar adequação e limitações do produto de forma transparente.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'shield', true, true, 31, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-32', CURRENT_TIMESTAMP, 'cliente-diz-nao-e-o-momento', 'whatsapp-objecoes', 'Cliente diz não é o momento', 'Adiamento por falta de prioridade.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Necessidade","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Momento","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Consentimento de retorno","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Cliente diz não é o momento.
- Situação: Adiamento por falta de prioridade.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Necessidade: {{info1}}; Momento: {{info2}}; Consentimento de retorno: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Respeite a decisão e sugira acompanhamento somente se autorizado.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'shield', true, true, 32, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-33', CURRENT_TIMESTAMP, 'cliente-precisa-aprovar-com-socio', 'whatsapp-objecoes', 'Cliente precisa aprovar com sócio', 'Decisão depende de terceiro.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Proposta","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Critérios","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Participantes","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Prazo","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Cliente precisa aprovar com sócio.
- Situação: Decisão depende de terceiro.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Proposta: {{info1}}; Critérios: {{info2}}; Participantes: {{info3}}; Prazo: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Crie resumo encaminhável com critérios, custo e próximos passos sem pressionar.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'shield', true, true, 33, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-34', CURRENT_TIMESTAMP, 'follow-up-24-horas-apos-proposta', 'whatsapp-follow-up', 'Follow-up 24 horas após proposta', 'Proposta enviada no dia anterior.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Data","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Produto","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Pergunta pendente","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Follow-up 24 horas após proposta.
- Situação: Proposta enviada no dia anterior.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Data: {{info1}}; Produto: {{info2}}; Pergunta pendente: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Prepare mensagem curta e útil sem assumir desinteresse.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'repeat', true, true, 34, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-35', CURRENT_TIMESTAMP, 'follow-up-apos-3-dias', 'whatsapp-follow-up', 'Follow-up após 3 dias', 'Proposta em avaliação há três dias.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Histórico","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Escopo","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Prazo aceito","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Follow-up após 3 dias.
- Situação: Proposta em avaliação há três dias.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Histórico: {{info1}}; Escopo: {{info2}}; Prazo aceito: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Retome com nova informação relevante ou pergunta objetiva.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'repeat', true, true, 35, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-36', CURRENT_TIMESTAMP, 'follow-up-apos-7-dias', 'whatsapp-follow-up', 'Follow-up após 7 dias', 'Sem resposta há uma semana.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Tentativas anteriores","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Produto","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Canal","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Follow-up após 7 dias.
- Situação: Sem resposta há uma semana.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Tentativas anteriores: {{info1}}; Produto: {{info2}}; Canal: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Crie contato respeitoso com opção clara de encerrar o acompanhamento.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'repeat', true, true, 36, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-37', CURRENT_TIMESTAMP, 'recuperar-orcamento-antigo', 'whatsapp-follow-up', 'Recuperar orçamento antigo', 'Proposta enviada há semanas ou meses.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Data","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Validade","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Preço atual confirmado","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Recuperar orçamento antigo.
- Situação: Proposta enviada há semanas ou meses.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Data: {{info1}}; Validade: {{info2}}; Preço atual confirmado: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Retome conversa sem pressupor validade de preço ou estoque antigo.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'repeat', true, true, 37, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-38', CURRENT_TIMESTAMP, 'recuperar-conversa-interrompida', 'whatsapp-follow-up', 'Recuperar conversa interrompida', 'Cliente parou no meio da qualificação.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Última pergunta","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Contexto","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Tempo decorrido","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Recuperar conversa interrompida.
- Situação: Cliente parou no meio da qualificação.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Última pergunta: {{info1}}; Contexto: {{info2}}; Tempo decorrido: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Reconecte à necessidade original sem repetir toda a conversa.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'repeat', true, true, 38, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-39', CURRENT_TIMESTAMP, 'cadencia-de-cinco-contatos', 'whatsapp-follow-up', 'Cadência de cinco contatos', 'Planejar acompanhamento com pausas.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Produto","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Ciclo de compra","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Canal","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Permissões","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Cadência de cinco contatos.
- Situação: Planejar acompanhamento com pausas.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Produto: {{info1}}; Ciclo de compra: {{info2}}; Canal: {{info3}}; Permissões: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Monte até cinco mensagens distintas com espaçamento proporcional e condição de parada.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'repeat', true, true, 39, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-40', CURRENT_TIMESTAMP, 'encerrar-follow-up-com-elegancia', 'whatsapp-follow-up', 'Encerrar follow-up com elegância', 'Não há resposta após tentativas razoáveis.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Histórico","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Preferência de contato","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Encerrar follow-up com elegância.
- Situação: Não há resposta após tentativas razoáveis.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Histórico: {{info1}}; Preferência de contato: {{info2}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Crie encerramento cordial que respeite silêncio e permita retomada futura.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'repeat', true, true, 40, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-41', CURRENT_TIMESTAMP, 'solicitar-decisao-com-clareza', 'whatsapp-fechamento', 'Solicitar decisão com clareza', 'Cliente demonstrou intenção de compra.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Produto","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Condições","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Questões pendentes","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Solicitar decisão com clareza.
- Situação: Cliente demonstrou intenção de compra.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Produto: {{info1}}; Condições: {{info2}}; Questões pendentes: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Convide a avançar de forma consultiva e direta, sem pressionar.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'thumbs-up', true, true, 41, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-42', CURRENT_TIMESTAMP, 'confirmar-pedido', 'whatsapp-fechamento', 'Confirmar pedido', 'Cliente aceitou proposta.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Itens","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Quantidades","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Preço","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Dados necessários","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Confirmar pedido.
- Situação: Cliente aceitou proposta.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Itens: {{info1}}; Quantidades: {{info2}}; Preço: {{info3}}; Dados necessários: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Resuma os termos e peça confirmação antes de registrar pedido.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'thumbs-up', true, true, 42, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-43', CURRENT_TIMESTAMP, 'orientar-proximo-passo-do-pagamento', 'whatsapp-fechamento', 'Orientar próximo passo do pagamento', 'Pedido confirmado aguardando pagamento.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Métodos oficiais","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Vencimento real","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Instruções seguras","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Orientar próximo passo do pagamento.
- Situação: Pedido confirmado aguardando pagamento.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Métodos oficiais: {{info1}}; Vencimento real: {{info2}}; Instruções seguras: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Explique pagamento por canal oficial e evite coletar dados financeiros sensíveis em chat.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'thumbs-up', true, true, 43, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-44', CURRENT_TIMESTAMP, 'fechar-com-escolha-entre-alternativas', 'whatsapp-fechamento', 'Fechar com escolha entre alternativas', 'Cliente avaliou duas opções.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Alternativa a e b","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Valores","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Diferenças","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Fechar com escolha entre alternativas.
- Situação: Cliente avaliou duas opções.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Alternativa a e b: {{info1}}; Valores: {{info2}}; Diferenças: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Pergunte qual alternativa atende melhor, sem criar falsa dicotomia.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'thumbs-up', true, true, 44, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-45', CURRENT_TIMESTAMP, 'recuperar-checkout-abandonado', 'whatsapp-fechamento', 'Recuperar checkout abandonado', 'Compra iniciada não concluída com permissão de contato.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Produto","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Motivo conhecido","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Link oficial","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Prazo","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Recuperar checkout abandonado.
- Situação: Compra iniciada não concluída com permissão de contato.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Produto: {{info1}}; Motivo conhecido: {{info2}}; Link oficial: {{info3}}; Prazo: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Crie contato de ajuda sem expor detalhes financeiros nem inventar escassez.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'thumbs-up', true, true, 45, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-46', CURRENT_TIMESTAMP, 'mensagem-de-agradecimento', 'whatsapp-pos-venda', 'Mensagem de agradecimento', 'Compra foi concluída.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Produto","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Nome opcional","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Detalhes de entrega","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Mensagem de agradecimento.
- Situação: Compra foi concluída.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Produto: {{info1}}; Nome opcional: {{info2}}; Detalhes de entrega: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Agradeça sem solicitar avaliação prematura ou fazer promessas.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'heart', true, true, 46, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-47', CURRENT_TIMESTAMP, 'pesquisa-rapida-de-satisfacao', 'whatsapp-pos-venda', 'Pesquisa rápida de satisfação', 'Cliente recebeu produto ou serviço.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Momento","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Canal","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Objetivo de feedback","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Pesquisa rápida de satisfação.
- Situação: Cliente recebeu produto ou serviço.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Momento: {{info1}}; Canal: {{info2}}; Objetivo de feedback: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Crie pesquisa com até três perguntas neutras e opção de resposta livre.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'heart', true, true, 47, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-48', CURRENT_TIMESTAMP, 'pedir-avaliacao-ou-indicacao', 'whatsapp-pos-venda', 'Pedir avaliação ou indicação', 'Cliente teve experiência positiva observada.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Canal oficial","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Autorização","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Contexto","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Pedir avaliação ou indicação.
- Situação: Cliente teve experiência positiva observada.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Canal oficial: {{info1}}; Autorização: {{info2}}; Contexto: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Solicite avaliação genuína, sem incentivo condicionado a nota positiva.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'heart', true, true, 48, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-49', CURRENT_TIMESTAMP, 'campanha-de-recompra', 'whatsapp-pos-venda', 'Campanha de recompra', 'Cliente pode necessitar comprar novamente.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Data última compra","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Ciclo de consumo","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Produtos compatíveis","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Campanha de recompra.
- Situação: Cliente pode necessitar comprar novamente.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Data última compra: {{info1}}; Ciclo de consumo: {{info2}}; Produtos compatíveis: {{info3}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Convide à recompra com relevância e sem presumir necessidade.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'heart', true, true, 49, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', ''),
  ('whatsapp-50', CURRENT_TIMESTAMP, 'reativar-cliente-inativo', 'whatsapp-pos-venda', 'Reativar cliente inativo', 'Cliente não compra há período definido.', 'Uma mensagem pronta para o WhatsApp, uma versão curta, uma versão mais consultiva, quando usar e uma réplica para a provável resposta do cliente.', '[{"key":"empresa","label":"Minha empresa","tipo":"texto","obrigatorio":false,"perfil":"nomeEmpresa"},{"key":"segmento","label":"Segmento","tipo":"texto","obrigatorio":false,"perfil":"segmento"},{"key":"produto","label":"Produto ou serviço","tipo":"texto","obrigatorio":false,"perfil":"produtos"},{"key":"tipoCliente","label":"Perfil do destinatário","tipo":"texto","obrigatorio":false,"placeholder":"Ex: dona de casa que pediu orçamento de armário"},{"key":"historico","label":"Histórico relevante da conversa","tipo":"textarea","obrigatorio":false,"placeholder":"Resumo do que já foi conversado","ajuda":"Sem dados sensíveis (CPF, endereço, dados de pagamento)."},{"key":"info1","label":"Última compra","tipo":"texto","obrigatorio":false},{"key":"info2","label":"Intervalo","tipo":"texto","obrigatorio":false},{"key":"info3","label":"Histórico","tipo":"texto","obrigatorio":false},{"key":"info4","label":"Consentimento","tipo":"texto","obrigatorio":false},{"key":"objetivo","label":"Objetivo desta mensagem","tipo":"texto","obrigatorio":true,"placeholder":"Ex: marcar uma visita para medir o ambiente"},{"key":"tom","label":"Tom de voz","tipo":"select","opcoes":["Consultivo","Amigável","Direto"],"obrigatorio":true}]'::jsonb, 'Atue como consultor de vendas consultivas e comunicação comercial por WhatsApp, especializado em pequenas e médias empresas brasileiras.

CONTEXTO DA TAREFA
- Ferramenta: Reativar cliente inativo.
- Situação: Cliente não compra há período definido.
- Minha empresa: {{empresa}}.
- Segmento: {{segmento}}.
- Produto ou serviço: {{produto}}.
- Perfil do destinatário: {{tipoCliente}}.
- Histórico relevante da conversa: {{historico}}.
- Informações específicas: Última compra: {{info1}}; Intervalo: {{info2}}; Histórico: {{info3}}; Consentimento: {{info4}}.
- Objetivo desta mensagem: {{objetivo}}.
- Tom de voz: {{tom}}.

TAREFA ESPECIALIZADA
Crie reaproximação baseada em histórico real e opção de não receber mensagens.

ENTREGUE
1. Uma mensagem principal pronta para copiar no WhatsApp (até 450 caracteres, sempre que possível).
2. Uma variação curta e objetiva (até 220 caracteres, sempre que possível).
3. Uma variação mais consultiva, com linguagem natural.
4. Uma explicação em duas linhas: quando usar e qual próximo passo esperar.
5. Uma possível resposta do cliente e uma réplica adequada, sem insistência.

REGRAS
- Escreva em português brasileiro, sem jargão e sem excesso de emojis.
- Não invente preços, descontos, disponibilidade, depoimentos, prazos, garantias, urgência ou escassez.
- Não faça promessas de resultado nem use pressão ou manipulação.
- Se faltarem informações indispensáveis, faça até três perguntas objetivas antes de redigir; caso contrário, prossiga sinalizando as premissas.
- Use apenas dados pertinentes e considere consentimento para o contato. Respeite qualquer solicitação de interrupção.
- O texto final deve parecer uma mensagem de uma pessoa real, não um anúncio genérico.', '', 'heart', true, true, 50, 'Preencha os campos, prepare o prompt e cole no ChatGPT ou no Claude — se puder, na mesma conversa em que você já falou do seu negócio, para aproveitar o contexto. Revise preços, prazos, políticas, destinatário e consentimento antes de enviar qualquer mensagem no WhatsApp. Os prompts geram sugestões de mensagens; nada é enviado automaticamente.', '')
ON CONFLICT ("slug") DO NOTHING;
