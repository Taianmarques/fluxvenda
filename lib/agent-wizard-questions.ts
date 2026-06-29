export type WizardQuestions = {
  descricaoEmpresaLabel: string;
  descricaoEmpresaPlaceholder: string;
  servicosLabel: string;
  servicosPlaceholder: string;
  precosLabel: string;
  precosPlaceholder: string;
  objecoesLabel: string;
  objecoesPlaceholder: string;
  horarioDefault: string;
};

export const DEFAULT_WIZARD_QUESTIONS: WizardQuestions = {
  descricaoEmpresaLabel: "Conte sobre sua empresa",
  descricaoEmpresaPlaceholder: "História, diferenciais, público-alvo, o que vocês fazem de melhor...",
  servicosLabel: "Serviços/produtos (um por linha)",
  servicosPlaceholder: "",
  precosLabel: "Preços e condições",
  precosPlaceholder: "Valores, formas de pagamento, parcelamento, garantias...",
  objecoesLabel: "Objeções comuns (uma por linha)",
  objecoesPlaceholder: "",
  horarioDefault: "Segunda a sexta, 9h às 18h",
};

export const AGENT_WIZARD_QUESTIONS: Record<string, WizardQuestions> = {
  "SaaS": {
    descricaoEmpresaLabel: "Conte sobre seu produto",
    descricaoEmpresaPlaceholder: "O que o software faz, pra quem é, principais diferenciais...",
    servicosLabel: "Planos e funcionalidades principais (um por linha)",
    servicosPlaceholder: "Ex: Plano Starter, Plano Pro, Integração com CRM...",
    precosLabel: "Preços e planos",
    precosPlaceholder: "Valores por plano, cobrança mensal/anual, trial gratuito...",
    objecoesLabel: "Objeções comuns (uma por linha)",
    objecoesPlaceholder: "Ex: Já uso outra ferramenta, Preciso de aprovação interna...",
    horarioDefault: "Segunda a sexta, 9h às 18h (suporte)",
  },
  "Indústria": {
    descricaoEmpresaLabel: "Conte sobre sua empresa",
    descricaoEmpresaPlaceholder: "Histórico, certificações, capacidade produtiva, diferenciais...",
    servicosLabel: "Produtos/linhas fabricadas (um por linha)",
    servicosPlaceholder: "Ex: Linha de embalagens, Peças sob encomenda...",
    precosLabel: "Condições comerciais",
    precosPlaceholder: "Pedido mínimo, prazo de entrega, formas de pagamento...",
    objecoesLabel: "Objeções comuns (uma por linha)",
    objecoesPlaceholder: "Ex: Prazo de entrega muito longo, Preciso de amostra antes...",
    horarioDefault: "Segunda a sexta, 8h às 17h",
  },
  "Serviços": {
    descricaoEmpresaLabel: "Conte sobre sua empresa",
    descricaoEmpresaPlaceholder: "Área de atuação, experiência, principais clientes/cases...",
    servicosLabel: "Serviços oferecidos (um por linha)",
    servicosPlaceholder: "Ex: Consultoria de processos, Auditoria, Suporte técnico...",
    precosLabel: "Valores e formas de cobrança",
    precosPlaceholder: "Por hora, por projeto, mensalidade...",
    objecoesLabel: "Objeções comuns (uma por linha)",
    objecoesPlaceholder: "Ex: Já tenho um fornecedor, Achei caro pelo escopo...",
    horarioDefault: "Segunda a sexta, 9h às 18h",
  },
  "Varejo": {
    descricaoEmpresaLabel: "Conte sobre sua loja",
    descricaoEmpresaPlaceholder: "O que a loja vende, estilo/público, diferenciais...",
    servicosLabel: "Categorias/produtos principais (um por linha)",
    servicosPlaceholder: "Ex: Vestidos, Calças, Acessórios...",
    precosLabel: "Preços e formas de pagamento",
    precosPlaceholder: "Faixa de preço, parcelamento, frete...",
    objecoesLabel: "Objeções comuns (uma por linha)",
    objecoesPlaceholder: "Ex: Achei caro, Não sei meu tamanho, Demora pra entregar...",
    horarioDefault: "Segunda a sábado, 10h às 20h",
  },
  "Saúde": {
    descricaoEmpresaLabel: "Conte sobre a clínica/consultório",
    descricaoEmpresaPlaceholder: "Especialidades, equipe, diferenciais no atendimento...",
    servicosLabel: "Convênios aceitos e especialidades/serviços (um por linha)",
    servicosPlaceholder: "Ex: Unimed, Particular, Avaliação inicial, Limpeza...",
    precosLabel: "Valores de consulta/procedimentos",
    precosPlaceholder: "Consulta particular, pacotes, parcelamento...",
    objecoesLabel: "Objeções comuns (uma por linha)",
    objecoesPlaceholder: "Ex: Meu convênio não atende aqui?, Achei caro, Tenho medo de...",
    horarioDefault: "Segunda a sexta, 8h às 18h",
  },
  "Educação": {
    descricaoEmpresaLabel: "Conte sobre sua instituição/curso",
    descricaoEmpresaPlaceholder: "Tipo de curso/instituição, metodologia, diferenciais...",
    servicosLabel: "Cursos/turmas oferecidos (um por linha)",
    servicosPlaceholder: "Ex: Curso de inglês básico, Turma intensiva...",
    precosLabel: "Valores e formas de pagamento",
    precosPlaceholder: "Mensalidade, matrícula, parcelamento, bolsas...",
    objecoesLabel: "Objeções comuns (uma por linha)",
    objecoesPlaceholder: "Ex: Achei caro, Não tenho tempo, Já tentei outro curso...",
    horarioDefault: "Segunda a sábado, 8h às 21h",
  },
  "Financeiro": {
    descricaoEmpresaLabel: "Conte sobre sua empresa",
    descricaoEmpresaPlaceholder: "Tipo de produto financeiro, regulamentação, diferenciais...",
    servicosLabel: "Produtos/serviços oferecidos (um por linha)",
    servicosPlaceholder: "Ex: Empréstimo pessoal, Conta digital, Seguro de vida...",
    precosLabel: "Taxas e condições",
    precosPlaceholder: "Taxas de juros, mensalidades, isenções...",
    objecoesLabel: "Objeções comuns (uma por linha)",
    objecoesPlaceholder: "Ex: Taxa muito alta, Não confio, Já tenho em outro banco...",
    horarioDefault: "Segunda a sexta, 9h às 18h",
  },
};
