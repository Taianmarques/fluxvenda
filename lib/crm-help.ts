import type { CrmPageKey } from "@/lib/crm-nav-config";

// Conteúdo da Central de ajuda (app/(app)/crm/hub/ajuda) — um artigo por página do CRM,
// espelhando CRM_CATEGORIES/CRM_PAGES (lib/crm-nav-config.ts) pra nunca ficar dessincronizado
// do menu real. Cada página vira uma chave aqui; se faltar conteúdo pra uma chave nova, ela
// só não aparece na Central de ajuda (não quebra nada).
export type HelpBlock = { heading?: string; text?: string; bullets?: string[] };
export type HelpArticle = { summary: string; blocks: HelpBlock[] };

export const CRM_HELP: Partial<Record<CrmPageKey, HelpArticle>> = {
  mensagens: {
    summary: "A caixa de entrada central das conversas de WhatsApp e Instagram.",
    blocks: [
      { text: "Todas as conversas dos canais conectados chegam aqui. O agente de IA responde automaticamente com base no que foi configurado em Canais e Conhecimento; qualquer atendente pode assumir uma conversa a qualquer momento pra responder pessoalmente." },
      { heading: "Como usar", bullets: [
        "Clique numa conversa na lista pra abrir o histórico completo",
        "Use o botão de assumir/transferir pra tirar a conversa da IA e atender pessoalmente",
        "Encerrar uma conversa marca você como responsável por ela, mesmo que ninguém tenha assumido antes",
        "Notas internas (não vão pro cliente) ficam destacadas em âmbar no meio da conversa",
      ] },
    ],
  },
  aovivo: {
    summary: "Painel do gestor para acompanhar conversas em andamento em tempo real.",
    blocks: [
      { text: "Visão só para gestores: mostra o que está acontecendo agora nas conversas ativas, sem precisar abrir cada uma na aba Mensagens." },
    ],
  },
  agenda: {
    summary: "Compromissos marcados pela IA ou manualmente com os clientes.",
    blocks: [
      { text: "Reúne os horários agendados pelo agente durante o atendimento (com base nas regras de disponibilidade do agente) e agendamentos criados manualmente pela equipe." },
    ],
  },
  pipeline: {
    summary: "Funil de vendas em formato Kanban, com etapas personalizáveis.",
    blocks: [
      { text: "Cada card representa uma oportunidade de negócio com um contato. Arraste entre as colunas (etapas) pra atualizar o andamento — a IA também pode mover automaticamente com base nas instruções de cada etapa." },
      { heading: "Como usar", bullets: [
        "Clique no ícone de maleta do card pra abrir os detalhes: conversa, tarefas, arquivos e anotações sobre aquele negócio",
        "Use Ganhar/Perder pra fechar o negócio — Perder pede um motivo (configurável em Motivos de perda)",
        "As etapas, cores e instruções de cada uma são configuradas em Configurações > (editor de pipeline, dentro do próprio Pipeline)",
      ] },
    ],
  },
  vendas: {
    summary: "Acompanhamento dos negócios fechados e da receita gerada.",
    blocks: [
      { text: "Reúne as vendas concluídas (oportunidades marcadas como Ganho no Pipeline) com valores e histórico, pra acompanhar o desempenho comercial da equipe." },
    ],
  },
  comercio: {
    summary: "Catálogo de produtos e serviços que o agente pode oferecer.",
    blocks: [
      { text: "Cadastre os produtos/serviços da empresa (nome, descrição, preço, foto) pra que o agente de IA possa apresentá-los durante o atendimento e vinculá-los às oportunidades no Pipeline." },
    ],
  },
  dashboards: {
    summary: "Visão geral dos números do CRM em um só lugar.",
    blocks: [
      { text: "Reúne várias visões por abas: Vendas, Visão Geral, Agendamentos, Meu Desempenho e Funil — sem precisar navegar entre páginas separadas." },
    ],
  },
  campanhas: {
    summary: "Disparo de mensagens em massa pelo WhatsApp para listas de contatos.",
    blocks: [
      { text: "Só para gestores. Permite enviar uma mensagem (ou sequência) para vários contatos de uma vez, útil para divulgar promoções ou novidades." },
    ],
  },
  ligacoes: {
    summary: "Agente de ligação por voz (IA), para atender ou realizar chamadas.",
    blocks: [
      { text: "Histórico e configuração do agente de voz, que consegue conversar por telefone com clientes de forma automatizada." },
    ],
  },
  prospeccao: {
    summary: "Geração de leads novos a partir de busca automatizada.",
    blocks: [
      { text: "Ferramenta de prospecção ativa: busca potenciais clientes (por região/segmento) para alimentar o funil de vendas antes mesmo do primeiro contato." },
    ],
  },
  cobranca: {
    summary: "Agente automatizado de cobrança e lembretes de pagamento.",
    blocks: [
      { text: "Cuida do envio de lembretes e cobranças para clientes com pagamentos pendentes, sem precisar de um atendente fazendo isso manualmente." },
    ],
  },
  carteira: {
    summary: "Visão da carteira de clientes de cada atendente.",
    blocks: [
      { text: "Mostra quais contatos/oportunidades estão sob responsabilidade de cada pessoa da equipe — útil pra organizar quem cuida de quem." },
    ],
  },
  contatos: {
    summary: "Lista de todos os contatos que já falaram com a empresa.",
    blocks: [
      { text: "Cadastro central dos clientes/leads: nome, número, tags e histórico. Dá pra editar nome e número do contato direto por aqui." },
    ],
  },
  auditoria: {
    summary: "Registro de ações da equipe dentro do CRM.",
    blocks: [
      { text: "Só para gestores. Mostra um histórico do que foi feito por cada membro da equipe, útil pra acompanhar a operação e resolver dúvidas sobre alguma mudança." },
    ],
  },
  automacao: {
    summary: "Regras que fazem o CRM agir sozinho em determinados eventos.",
    blocks: [
      { text: "Configure ações automáticas — por exemplo, mover uma oportunidade de etapa, mandar uma mensagem de follow-up ou notificar alguém — disparadas por eventos do CRM, sem precisar de um atendente fazendo isso na mão." },
    ],
  },
  condicoes: {
    summary: "Regras condicionais usadas pelas automações e pelo agente.",
    blocks: [
      { text: "Define os \"se isso, então aquilo\" que as automações e o agente de IA usam pra decidir o que fazer em cada situação." },
    ],
  },
  canais: {
    summary: "Conexão dos canais de atendimento: WhatsApp, Instagram e outros.",
    blocks: [
      { text: "É por aqui que se conecta o número de WhatsApp (via QR code) e a conta de Instagram que o agente vai usar pra atender. Sem um canal conectado, a IA não recebe nem envia mensagem nenhuma." },
    ],
  },
  equipe: {
    summary: "Gestão de membros da equipe e permissões de acesso.",
    blocks: [
      { text: "Convide pessoas para a equipe, defina papéis e configure perfis de acesso — quais páginas cada perfil enxerga, e se atendentes veem conversas ainda não atribuídas a ninguém." },
    ],
  },
  conhecimento: {
    summary: "Base de conhecimento que a IA usa para responder.",
    blocks: [
      { text: "Documentos, perguntas frequentes e informações da empresa que alimentam o agente de IA, pra ele responder com precisão sobre produtos, políticas e dúvidas comuns dos clientes." },
    ],
  },
  treino: {
    summary: "Treinamento simulado de vendas para a equipe, com IA.",
    blocks: [
      { text: "Ambiente de prática onde a equipe treina abordagens e respostas de vendas conversando com uma IA que simula um cliente." },
    ],
  },
  mensagensrapidas: {
    summary: "Respostas prontas para agilizar o atendimento manual.",
    blocks: [
      { text: "Cadastre mensagens que os atendentes usam com frequência, pra não digitar a mesma resposta toda vez que assumem uma conversa." },
    ],
  },
  motivosperda: {
    summary: "Lista de motivos usados ao marcar um negócio como perdido.",
    blocks: [
      { text: "Personalize os motivos que aparecem quando alguém marca uma oportunidade como Perdida no Pipeline — ajuda a entender por que os negócios não fecham." },
    ],
  },
  creditos: {
    summary: "Consumo de IA do plano e compra de créditos extras.",
    blocks: [
      { text: "Acompanhe quanto da cota mensal de IA já foi usada e compre créditos extras via Pix ou cartão caso a equipe precise de mais capacidade antes do fim do mês." },
    ],
  },
  metas: {
    summary: "Metas de vendas da equipe.",
    blocks: [
      { text: "Só para gestores. Defina metas (de vendas, atendimentos, etc.) e acompanhe o progresso da equipe em direção a elas." },
    ],
  },
};
