import type { QuizStep, QuizResult } from "@/lib/lead-form-shared";
import { stepsToQuestions } from "@/lib/lead-form-shared";

// Modelos prontos de formulário — ponto de partida e demonstração do quiz em telas. O conteúdo é
// da própria FluxVenda (diagnóstico de maturidade comercial → plano de ação com checkout no quiz).

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fluxvenda.com.br";

const opcoes = (lista: [string, string, string][]) => ({
  options: lista.map(([, texto]) => texto),
  optionMedia: Object.fromEntries(lista.map(([emoji, texto]) => [texto, { emoji }])),
  optionResults: Object.fromEntries(lista.map(([, texto, resultado]) => [texto, resultado])),
});

export function quizExemploTemplate() {
  const quizResults: QuizResult[] = [
    {
      key: "improviso", titulo: "Comercial no improviso", nivel: 1,
      descricao: "Pelas suas respostas, **leads estão esfriando** antes de alguém responder e quase ninguém recebe follow-up. Você está deixando venda na mesa todos os dias — e dá pra resolver rápido.",
      mensagem: "{{nome}}, seu diagnóstico saiu: *{{resultado}}*.\n\nO ponto mais urgente é a velocidade de resposta — lead que espera, compra do concorrente. Quer que eu te mostre como a IA da FluxVenda responde seus leads na hora, 24h por dia?",
      etiquetaId: null, pipelineStageId: null, conversionUrl: "",
    },
    {
      key: "construcao", titulo: "Comercial em construção", nivel: 3,
      descricao: "Você já tem **parte do processo** rodando, mas ainda depende de alguém lembrar de responder e de fazer follow-up. Automatizar essas etapas é o que separa você do próximo nível.",
      mensagem: "{{nome}}, seu diagnóstico saiu: *{{resultado}}*.\n\nVocê já tem uma base boa — o que falta é tirar o follow-up e o primeiro atendimento da mão do time. Posso te mostrar como fica isso com a FluxVenda?",
      etiquetaId: null, pipelineStageId: null, conversionUrl: "",
    },
    {
      key: "estruturado", titulo: "Comercial estruturado", nivel: 5,
      descricao: "Seu comercial **já tem processo**. Agora o ganho está em escala: atender mais leads sem aumentar o time e medir cada etapa do funil.",
      mensagem: "{{nome}}, seu diagnóstico saiu: *{{resultado}}*. Parabéns, poucos chegam aqui!\n\nO próximo passo é escalar sem contratar — quer ver como a IA da FluxVenda atende e qualifica no volume?",
      etiquetaId: null, pipelineStageId: null, conversionUrl: "",
    },
  ];

  const steps: QuizStep[] = [
    {
      id: "s-intro", type: "conteudo",
      titulo: "SE O SEU WHATSAPP VIVE CHEIO E AS VENDAS NÃO ACOMPANHAM, ==ESSE TESTE É PRA VOCÊ==",
      texto: "Leva menos de 2 minutos: responda algumas perguntas rápidas e receba um **diagnóstico do seu comercial** no final.",
      destaqueTitulo: "", destaqueTexto: "", destaqueCor: "azul", botao: "Começar o teste",
    },
    { id: "s-nome", type: "pergunta", question: { key: "nome", label: "Antes de começar, qual é o seu nome?", type: "TEXTO" } },
    {
      id: "s-whatsapp", type: "pergunta",
      question: { key: "whatsapp", label: "{{nome}}, qual o seu WhatsApp com DDD?", subtitulo: "Seu diagnóstico também chega por lá.", type: "WHATSAPP" },
    },
    {
      id: "s-tempo", type: "pergunta",
      question: {
        key: "tempo_resposta", label: "Quanto tempo seu time demora pra responder um **lead novo**?", type: "ESCOLHA", layout: "lista",
        ...opcoes([
          ["⚡", "Menos de 5 minutos", "estruturado"],
          ["🙂", "Até 1 hora", "construcao"],
          ["😬", "Algumas horas", "improviso"],
          ["😰", "Às vezes só no dia seguinte", "improviso"],
        ]),
      },
    },
    {
      id: "s-velocidade", type: "conteudo",
      titulo: "Velocidade [vermelho]vende[/vermelho]",
      texto: "",
      destaqueTitulo: "Quem responde primeiro leva a venda",
      destaqueTexto: "Um lead que espera horas por uma resposta já está conversando com o concorrente. Os primeiros minutos depois do contato são os que mais convertem.",
      destaqueCor: "vermelho", botao: "Continuar",
    },
    {
      id: "s-acompanhamento", type: "pergunta",
      question: {
        key: "acompanhamento", label: "Como você acompanha suas **negociações** hoje?", type: "ESCOLHA", layout: "lista",
        ...opcoes([
          ["📊", "CRM com funil de vendas", "estruturado"],
          ["📒", "Planilha", "construcao"],
          ["🧠", "De cabeça / pelas conversas do WhatsApp", "improviso"],
        ]),
      },
    },
    {
      id: "s-followup", type: "pergunta",
      question: {
        key: "followup", label: "Você faz **follow-up** com quem parou de responder?", type: "ESCOLHA", layout: "lista",
        ...opcoes([
          ["✅", "Sempre, com uma sequência definida", "estruturado"],
          ["🔁", "Às vezes, quando lembro", "construcao"],
          ["❌", "Quase nunca", "improviso"],
        ]),
      },
    },
    {
      id: "s-horario", type: "pergunta",
      question: {
        key: "fora_horario", label: "Seu atendimento funciona **fora do horário comercial**?", type: "ESCOLHA", layout: "lista",
        ...opcoes([
          ["🤖", "Sim, com automação", "estruturado"],
          ["📱", "Só quando alguém pega o celular", "construcao"],
          ["🌙", "Não, só no dia seguinte", "improviso"],
        ]),
      },
    },
    {
      id: "s-time", type: "pergunta",
      question: {
        key: "time", label: "Quantas pessoas atendem clientes no seu comercial?", type: "ESCOLHA", layout: "lista",
        options: ["Só eu", "2 a 5", "6 a 15", "Mais de 15"],
        optionMedia: { "Só eu": { emoji: "🙋" }, "2 a 5": { emoji: "👥" }, "6 a 15": { emoji: "🏢" }, "Mais de 15": { emoji: "🏙️" } },
      },
    },
    { id: "s-calculando", type: "carregamento", texto: "Calculando o nível de maturidade do seu comercial com base nas suas respostas...", segundos: 5 },
    {
      id: "s-resultado", type: "resultado",
      titulo: "Nível de ==maturidade comercial==:",
      medidorTitulo: "Maturidade do seu comercial",
      niveis: ["Baixo", "Normal", "Médio", "Alto", "Muito alto"],
      compEsquerdaTitulo: "Hoje", compEsquerdaTexto: "O cenário diagnosticado com base nas suas respostas",
      compDireitaTitulo: "Com IA", compDireitaTexto: "Atendimento e follow-up automáticos com a FluxVenda",
      metricas: [
        { nome: "Leads respondidos na hora", esquerda: 25, direita: 98 },
        { nome: "Follow-ups feitos", esquerda: 20, direita: 95 },
        { nome: "Vendas perdidas por demora", esquerda: 70, direita: 10 },
      ],
      botao: "Ver meu plano de ação",
    },
    {
      id: "s-oferta", type: "oferta",
      titulo: "{{nome}}, o seu ==plano de ação== ficou pronto!",
      texto: "A FluxVenda **atende, qualifica e faz follow-up** dos seus leads pelo WhatsApp com IA, 24h por dia — e mostra tudo num funil de vendas.\n\nTeste grátis por 7 dias, sem cartão.",
      // Sem link: o botão segue pra tela de checkout logo abaixo (pagamento dentro do quiz)
      botao: "QUERO MEU PLANO", url: "",
      antesLabel: "ANTES", depoisLabel: "DEPOIS",
    },
    {
      id: "s-checkout", type: "checkout",
      titulo: "Garanta seu plano de ação com desconto",
      produtoNome: "Plano de ação comercial (exemplo)",
      precoDe: 197, precoPor: 47,
      parcelasMax: 11, parcelasSemJuros: 1, jurosPorParcela: 1.89,
      pix: true, cartao: true,
      timerMinutos: 10, garantiaDias: 7, compraSegura: true,
      botao: "",
      sucessoTitulo: "Pagamento confirmado!",
      sucessoTexto: "Enviamos os próximos passos no seu WhatsApp.",
      acessoUrl: "", acessoBotao: "Acessar agora",
      mensagemPago: "{{nome}}, pagamento confirmado! 🎉 Já já te mando por aqui os próximos passos do seu plano de ação.",
    },
  ];

  return {
    title: "Exemplo — Quiz de maturidade comercial",
    headline: "Descubra o nível de maturidade do seu comercial.",
    style: "TELAS",
    steps,
    questions: stepsToQuestions(steps),
    quizResults,
    accentColor: "#1d4ed8",
    // Exemplo nasce em modo teste: o checkout cobra na conta sandbox (sem dinheiro real)
    checkoutSandbox: true,
    inviteMessage: "Oi, {{nome}}! Aqui é da FluxVenda 👋 Recebi o início do seu diagnóstico comercial — termina o teste lá que eu te mando o resultado por aqui.",
    doneMessage: "Prontinho! Seu diagnóstico também foi pro seu WhatsApp.",
  };
}
