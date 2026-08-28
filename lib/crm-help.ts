import type { CrmPageKey } from "@/lib/crm-nav-config";

// Conteúdo da Central de ajuda (app/(app)/crm/hub/ajuda) — um artigo por página do CRM,
// espelhando CRM_CATEGORIES/CRM_PAGES (lib/crm-nav-config.ts) pra nunca ficar dessincronizado
// do menu real. Cada página vira uma chave aqui; se faltar conteúdo pra uma chave nova, ela
// só não aparece na Central de ajuda (não quebra nada). `screenshot` aponta pra um print real
// (public/ajuda/<key>.png, capturado numa conta de teste — nomes/telefones/fotos de contatos
// reais foram substituídos por dados fictícios antes da captura).
export type HelpBlock = { heading?: string; text?: string; bullets?: string[] };
export type HelpArticle = { summary: string; screenshot?: string; blocks: HelpBlock[] };

export const CRM_HELP: Partial<Record<CrmPageKey, HelpArticle>> = {
  mensagens: {
    summary: "A caixa de entrada central das conversas de WhatsApp e Instagram.",
    screenshot: "/ajuda/mensagens.png",
    blocks: [
      {
        text: "Todas as conversas dos canais conectados chegam aqui. O agente de IA responde automaticamente com base no que foi configurado em Canais e Conhecimento; qualquer atendente pode assumir uma conversa a qualquer momento pra responder pessoalmente.",
      },
      {
        heading: "As abas da lista",
        bullets: [
          "Ativos — conversas em andamento (é onde a maior parte do trabalho acontece)",
          "Pendentes — mensagens que chegaram e ainda esperam alguma ação",
          "Grupos — conversas de grupo do WhatsApp (a IA nunca responde grupo automaticamente, só atendente)",
          "O ícone de check ao lado marca/filtra conversas já lidas",
        ],
      },
      {
        heading: "Como assumir uma conversa da IA",
        text: "Enquanto a IA está atendendo, o campo de mensagem mostra \"Digite uma mensagem para assumir a conversa...\". Basta escrever e enviar: a partir daí a IA para de responder automaticamente naquela conversa até alguém liberar de novo (transferir de volta).",
      },
      {
        heading: "Cabeçalho da conversa aberta",
        text: "No topo da conversa ficam o nome/telefone do contato, o valor do negócio (se já existir uma oportunidade vinculada) e os ícones de ação: transferir para outro atendente/departamento, marcar retorno na agenda, ver os detalhes do negócio (ícone de maleta — abre conversa, tarefas, arquivos e anotações num só lugar) e encerrar o atendimento.",
      },
      {
        heading: "Barra de envio",
        bullets: [
          "Raio ⚡ — mensagens rápidas (respostas prontas cadastradas em Configurações > Mensagens rápidas)",
          "Clipe de papel — anexar arquivo",
          "Ícone de produto — enviar um item do catálogo (Vendas > Produtos)",
          "Microfone — gravar um áudio",
        ],
      },
      {
        heading: "Notas internas",
        text: "Uma nota interna (balão âmbar \"Nota interna — Atendente\") fica só pra equipe, o cliente nunca vê. Serve pra deixar um recado sobre o andamento da negociação pro próximo atendente que pegar a conversa.",
      },
    ],
  },

  aovivo: {
    summary: "Painel do gestor para acompanhar conversas em andamento em tempo real.",
    screenshot: "/ajuda/aovivo.png",
    blocks: [
      { text: "Visão só para gestores: mostra o que está acontecendo agora nas conversas ativas, sem precisar abrir a aba Mensagens e ficar clicando em cada uma." },
      { text: "A tela é organizada em colunas — uma coluna \"Pendentes\" (mensagens aguardando alguma ação) e uma coluna por atendente/agente, mostrando quantos atendimentos cada um tem em andamento nesse momento. A tela atualiza sozinha, sem precisar recarregar." },
    ],
  },

  agenda: {
    summary: "Compromissos marcados pela IA ou manualmente com os clientes.",
    screenshot: "/ajuda/agenda.png",
    blocks: [
      { text: "Mostra a semana em formato de grade (dia x horário), reunindo os agendamentos marcados pelo agente de IA durante o atendimento e os criados manualmente pela equipe." },
      { heading: "Como usar", bullets: [
        "\"+ Novo agendamento\" cria um compromisso manualmente",
        "\"Serviços e profissionais\" cadastra o que pode ser agendado e quem atende cada tipo de serviço — é esse cadastro que define os horários que a IA oferece pro cliente",
        "\"Configurações\" ajusta o funcionamento (dias/horários disponíveis) usado pela IA pra calcular os horários livres",
        "\"Semana anterior\"/\"Próxima semana\" navegam a visualização; \"Hoje\" volta pra semana atual",
      ] },
    ],
  },

  pipeline: {
    summary: "Funil de vendas em formato Kanban, com etapas personalizáveis.",
    screenshot: "/ajuda/pipeline.png",
    blocks: [
      { text: "Cada card representa uma oportunidade de negócio vinculada a uma conversa. Arraste um card entre as colunas (etapas) pra atualizar o andamento — a IA também pode mover automaticamente com base nas instruções configuradas em cada etapa." },
      { heading: "Abas no topo", text: "Cada aba é um pipeline diferente (é possível ter mais de um funil, por exemplo um pra vendas e outro pra suporte) — \"+ Novo pipeline\" cria um a mais. Clicar no nome de uma etapa (cabeçalho da coluna) deixa editar nome, cor e as instruções que a IA usa naquela etapa." },
      { heading: "O card", bullets: [
        "Ícone de balão de conversa — abre a conversa desse contato rapidinho, num popup",
        "Ícone de maleta — abre o modal completo de detalhes: dados do lead, valor do negócio, conversa, tarefas, arquivos e anotações, além dos botões Ganhar/Perder",
        "Menu \"⋮\" — acesso rápido às tarefas do negócio",
        "\"+ status\" — muda o nível de prioridade/status visual do card",
      ] },
      { heading: "Ganhar ou perder um negócio", text: "Dentro do modal de detalhes (ícone de maleta), os botões Ganhar e Perder fecham a negociação. Perder pede um motivo — a lista de motivos é configurada em Configurações > Motivos de perda, o que transforma esse dado em relatório em vez de texto solto." },
      { heading: "\"Definir agente do pipeline\" e \"Filtros\"", text: "\"Definir agente do pipeline\" escolhe qual agente de IA acompanha esse funil (relevante pra quem tem mais de um número/agente). \"Filtros\" restringe o que aparece no board (por responsável, por etapa, etc.)." },
    ],
  },

  vendas: {
    summary: "Acompanhamento dos negócios fechados e da receita gerada.",
    screenshot: "/ajuda/vendas.png",
    blocks: [
      { text: "Reúne as negociações marcadas como Ganho no Pipeline: total ganho no período, número de negócios ganhos, ticket médio e o total que ainda está em aberto (soma dos negócios não fechados)." },
      { text: "O gráfico \"Receita ganha por mês\" mostra a evolução mês a mês. Mais abaixo, \"Motivos de encerramento\" resume por que os atendimentos foram finalizados (com base no que foi informado ao encerrar a conversa no chat), e \"Negócios abertos por etapa\" mostra quanto dinheiro está parado em cada etapa do funil agora." },
    ],
  },

  comercio: {
    summary: "Catálogo de produtos e serviços que o agente pode oferecer.",
    screenshot: "/ajuda/comercio.png",
    blocks: [
      { text: "Cadastre os produtos/serviços da empresa pra que o agente de IA possa apresentá-los durante o atendimento e vinculá-los às vendas. Cada produto tem nome, preço (com desconto opcional, mostrado riscado) e foto." },
      { heading: "Como usar", bullets: [
        "\"+ Novo produto\" cadastra um item; \"Importar planilha (CSV)\" cadastra vários de uma vez (use \"Baixar modelo\" pra pegar o formato certo)",
        "Em cada produto: Editar, trocar a Foto, Desativar (some da IA sem apagar o histórico) ou Remover",
        "\"Personalizar loja\" ajusta a aparência da vitrine pública de produtos",
        "\"Configurar pagamento\" liga a cobrança (Pix/cartão) pra quando o cliente fecha a compra direto pela IA",
        "\"Pedidos recentes\" lista as compras feitas pelos clientes através do agente",
      ] },
    ],
  },

  dashboards: {
    summary: "Visão geral dos números do CRM em um só lugar.",
    screenshot: "/ajuda/dashboards.png",
    blocks: [
      { text: "Reúne várias visões por abas — Vendas, Visão Geral, Agendamentos, Meu Desempenho e Funil — sem precisar navegar entre páginas separadas. O período de comparação (7/30/90 dias ou datas customizadas) fica sempre no topo, ao lado das abas." },
      { heading: "Aba Visão Geral", bullets: [
        "Total de negócios, ganhos, perdidos e em aberto no período",
        "Meta geral do mês (configurada em Configurações > Metas) comparada ao realizado",
        "Oportunidades abertas, CAC (custo por cliente adquirido), LTV médio e taxa de conversão de leads",
        "LTV por vendedor e taxa de conversão por vendedor, pra comparar o desempenho da equipe",
      ] },
    ],
  },

  campanhas: {
    summary: "Disparo de mensagens em massa pelo WhatsApp para listas de contatos.",
    screenshot: "/ajuda/campanhas.png",
    blocks: [
      { text: "Só para gestores. \"+ Nova campanha\" cria um disparo em massa: escolhe os destinatários, o texto da mensagem e o intervalo entre cada envio (o próprio sistema espera um tempo aleatório dentro da faixa escolhida entre uma mensagem e outra, pra reduzir o risco de o número do WhatsApp ser bloqueado)." },
      { text: "Uma variação por IA pode reescrever o texto de forma um pouco diferente pra cada destinatário, mantendo o mesmo significado — o que também ajuda a evitar bloqueio por mensagem repetida. Use com moderação, e só com contatos que já interagiram com a empresa antes." },
    ],
  },

  ligacoes: {
    summary: "Agente de ligação por voz (IA), para atender ou realizar chamadas.",
    screenshot: "/ajuda/ligacoes.png",
    blocks: [
      { text: "\"+ Nova ligação\" faz o agente ligar para um contato automaticamente e conduzir a conversa por voz. Cada ligação feita/recebida fica registrada nessa lista, com o histórico da chamada." },
    ],
  },

  prospeccao: {
    summary: "Geração de leads novos a partir de busca automatizada.",
    screenshot: "/ajuda/prospeccao.png",
    blocks: [
      { text: "\"Buscar prospects no Google Maps\" encontra potenciais clientes automaticamente: informe o segmento (ex: \"restaurantes\"), a cidade/região e quantos resultados trazer, e o sistema lista os estabelecimentos encontrados como prospects." },
      { heading: "Funil de prospecção", text: "Cada prospect avança pelos estágios mostrados no topo (Novo, Abordado, Respondeu, Qualificado, Reunião agendada, Descartado, Encerrado) conforme a abordagem evolui. \"+ Adicionar\" inclui um prospect manualmente e \"Importar planilha\" traz uma lista pronta; \"Configurar\" ajusta como a abordagem automática acontece." },
    ],
  },

  cobranca: {
    summary: "Agente automatizado de cobrança e lembretes de pagamento.",
    screenshot: "/ajuda/cobranca.png",
    blocks: [
      { text: "\"+ Nova cobrança\" cadastra um valor a receber de um contato; o agente de cobrança cuida de mandar lembretes pelo WhatsApp conforme o vencimento se aproxima ou passa, sem precisar de um atendente fazendo isso na mão. \"Configurar\" ajusta o tom e a régua de mensagens usada nesses lembretes." },
    ],
  },

  carteira: {
    summary: "Visão da carteira de clientes de cada atendente.",
    screenshot: "/ajuda/carteira.png",
    blocks: [
      { text: "Lista todos os clientes/contatos com indicadores de relacionamento: quem comprou, quem não comprou no período, quem reduziu ou aumentou a compra e quem está sem contato recente." },
      { heading: "Nível da carteira", text: "Cada cliente recebe uma classificação automática (A/B/C/Inativo/Perdido) com base em recorrência, ticket e recência de compra — dá pra ajustar manualmente quando o padrão automático não reflete a realidade (ex: cliente que passou a comprar de outro fornecedor). \"Análise da IA\" gera um resumo comentado sobre a carteira." },
    ],
  },

  contatos: {
    summary: "Lista de todos os contatos que já conversaram com a empresa.",
    screenshot: "/ajuda/contatos.png",
    blocks: [
      { text: "Cadastro central dos clientes/leads: nome, número, etiquetas e última interação. \"+ Adicionar contato\" cadastra alguém manualmente (sem precisar esperar ele mandar mensagem primeiro)." },
      { heading: "Como usar", bullets: [
        "O lápis ao lado de cada contato edita nome e número; o balão de conversa vai direto pra conversa dele",
        "\"Etiquetas\" cria/gerencia as tags usadas pra segmentar contatos",
        "\"Importar CSV\" cadastra vários contatos de uma vez; \"Exportar CSV\" baixa a lista atual",
        "A busca no topo filtra por nome, número ou etiqueta",
      ] },
    ],
  },

  auditoria: {
    summary: "A IA analisa conversas reais e aponta pontos de atenção.",
    screenshot: "/ajuda/auditoria.png",
    blocks: [
      { text: "Só para gestores. Escolha um atendente (ou \"Todos\" pra visão geral) e o período, e clique em \"Gerar auditoria\": a IA lê uma amostra das conversas mais recentes desse período e devolve notas, pontos fortes, melhorias e as conversas que mais merecem atenção — em vez do gestor ter que reler manualmente atendimento por atendimento." },
    ],
  },

  automacao: {
    summary: "Regras que fazem o CRM agir sozinho em determinados eventos.",
    screenshot: "/ajuda/automacao.png",
    blocks: [
      { text: "São regras determinísticas do pipeline (sem IA envolvida): quando um atendente envia uma mensagem rápida específica no chat sem editar o texto, o lead é movido automaticamente pra etapa configurada naquela automação, e uma nota interna registra que a automação disparou." },
      { text: "\"+ Nova automação\" vincula uma mensagem rápida a uma etapa de destino. Importante: se o atendente editar o texto da mensagem rápida antes de enviar, a automação não dispara — o gatilho é enviar exatamente como está cadastrado." },
    ],
  },

  condicoes: {
    summary: "Regras condicionais usadas pelo agente no Instagram.",
    screenshot: "/ajuda/condicoes.png",
    blocks: [
      { text: "Configura como o agente reage a comentários/DMs do Instagram (por exemplo, responder automaticamente quando um comentário contém certas palavras-chave). Só funciona depois de conectar uma conta do Instagram em Canais — sem isso, a página fica bloqueada." },
    ],
  },

  canais: {
    summary: "Conexão dos canais de atendimento: WhatsApp, Instagram e outros.",
    screenshot: "/ajuda/canais.png",
    blocks: [
      { text: "É por aqui que se conecta o número de WhatsApp (via QR code) e a conta de Instagram que o agente vai usar pra atender. Sem um canal conectado, a IA não recebe nem envia mensagem nenhuma." },
      { heading: "Modo aprendizado", text: "Antes de ativar a IA de vez, dá pra deixar o canal em \"Modo aprendizado\": as conversas chegam e ficam salvas normalmente, mas a IA ainda não responde em nenhum canal — bom pra revisar o Conhecimento cadastrado antes de colocar o agente pra atender de verdade. \"Ativar IA\" liga o atendimento automático quando estiver pronto." },
      { heading: "Ações por canal", bullets: [
        "WhatsApp: Pausar (para o atendimento temporariamente sem desconectar), Reconectar (gera um novo QR code) e Pausar IA (só a IA para, atendentes continuam podendo responder)",
        "Instagram DM: \"Conectar Instagram\" inicia a autenticação com a conta comercial",
        "\"+ Novo agente\" cria outro número/instância de atendimento além do já conectado",
      ] },
    ],
  },

  equipe: {
    summary: "Gestão de membros da equipe e permissões de acesso.",
    screenshot: "/ajuda/equipe.png",
    blocks: [
      { text: "Convide pessoas para a equipe, defina papéis e configure perfis de acesso — quais páginas cada perfil enxerga, e se atendentes veem conversas ainda não atribuídas a ninguém." },
      { heading: "Adicionar alguém", text: "Duas formas: copiar/enviar o link de convite (a pessoa entra e já ganha acesso) ou usar \"Adicionar direto\", que cadastra a pessoa na hora sem precisar de convite." },
      { heading: "Departamentos e perfis de acesso", text: "Departamentos são usados pela IA pra transferir a conversa pro setor certo, com base na descrição de cada um. Perfis de acesso definem quais páginas do menu cada perfil enxerga — quem não tem perfil atribuído mantém acesso total." },
      { heading: "Lista de membros", text: "Cada membro mostra o papel (Gestor/Atendente) e o nível de acesso. Dá pra editar o perfil de acesso de alguém, bloquear temporariamente ou remover — remover alguém da equipe não apaga a conta da pessoa, só tira o acesso a essa equipe." },
    ],
  },

  conhecimento: {
    summary: "Base de conhecimento que a IA usa para responder.",
    screenshot: "/ajuda/conhecimento.png",
    blocks: [
      { text: "Cadastre FAQs, regras de negócio e informações da empresa (horários, políticas, diferenciais) — a IA usa esses conteúdos pra responder os clientes com mais precisão. \"+ Novo conteúdo\" cria um item de texto direto; \"Importar de arquivo\" aceita .txt, .md, .pdf e .docx (PDF escaneado/imagem não é suportado, precisa ser texto selecionável)." },
      { text: "Cada conteúdo pode ser desativado sem apagar (fica de fora do que a IA usa até reativar). Há um limite de itens e de caracteres por item — dá pra ver o total usado no topo da página." },
    ],
  },

  treino: {
    summary: "Treinamento simulado de vendas para a equipe, com IA.",
    screenshot: "/ajuda/treino.png",
    blocks: [
      { text: "Cadastre exemplos de atendimentos reais: um cenário curto (o contexto) e a conversa simulada (como foi a troca de mensagens). Quando um cliente de verdade escrever algo parecido, a IA usa o exemplo mais próximo como referência pra responder — sem precisar reescrever as instruções gerais do agente pra cobrir cada caso específico." },
      { text: "\"Ajustes\" controla o comportamento fino desse mecanismo (quantos exemplos a IA pode usar por resposta e o quanto a mensagem do cliente precisa se parecer com o exemplo cadastrado pra ele ser usado)." },
    ],
  },

  mensagensrapidas: {
    summary: "Respostas prontas para agilizar o atendimento manual.",
    screenshot: "/ajuda/mensagensrapidas.png",
    blocks: [
      { text: "Cadastre mensagens que os atendentes usam com frequência (saudação, horário de funcionamento, política de troca) pra não digitar a mesma resposta toda vez que assumem uma conversa — ficam disponíveis pra equipe inteira pelo ícone de raio ⚡ no chat." },
      { text: "Lembre que uma mensagem rápida também pode disparar uma automação (ver Automação) quando enviada sem edição — então o texto cadastrado aqui pode, além de agilizar a digitação, mover o negócio de etapa sozinho." },
    ],
  },

  motivosperda: {
    summary: "Lista de motivos usados ao marcar um negócio como perdido.",
    screenshot: "/ajuda/motivosperda.png",
    blocks: [
      { text: "Personalize os motivos (preço, prazo, escolheu concorrente, etc.) que aparecem quando alguém marca uma oportunidade como Perdida no Pipeline. Isso transforma o motivo em dado estruturado pra relatório, em vez de cada atendente escrever um texto livre diferente." },
    ],
  },

  creditos: {
    summary: "Consumo de IA do plano e compra de créditos extras.",
    screenshot: "/ajuda/creditos.png",
    blocks: [
      { text: "Mostra a cota de tokens de IA do plano atual (quanto já foi usado no mês) e o saldo de créditos extras — créditos não expiram e só são consumidos automaticamente depois que a cota do mês acaba, pra não pausar os agentes." },
      { text: "\"Comprar créditos\" abre os pacotes disponíveis, com pagamento único via Pix ou cartão; os créditos são liberados automaticamente assim que o pagamento é confirmado." },
    ],
  },

  metas: {
    summary: "Metas de vendas da equipe.",
    screenshot: "/ajuda/metas.png",
    blocks: [
      { text: "Só para gestores. Defina uma meta geral da equipe e/ou uma meta individual por vendedor — reiniciam todo mês e são comparadas ao valor efetivamente ganho no mês corrente (aba Visão Geral dos Dashboards mostra o progresso)." },
      { text: "\"Investimento mensal em marketing/vendas\" é usado só pra calcular o CAC (custo por cliente adquirido) nos dashboards — não afeta a meta em si." },
    ],
  },
};
