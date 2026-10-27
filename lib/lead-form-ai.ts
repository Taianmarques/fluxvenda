import { anthropic, MODEL as CLAUDE_MODEL } from "@/lib/anthropic";
import { openai, MODEL as OPENAI_MODEL } from "@/lib/openai";
import { stepsSchema, questionsSchema, quizResultsSchema } from "@/lib/lead-form-schema";
import { stepsToQuestions, DEFAULT_NIVEIS, DESTAQUE_CORES, MAX_OPCAO_CHARS, type QuizStep, type QuizResult, type DestaqueCor } from "@/lib/lead-form-shared";

// Converte o roteiro/prompt de quiz que o usuário traz pronto (colado ou anexado) num quiz em telas.
// A IA não cria o quiz do zero: usa as perguntas, opções, resultados e textos do material e só
// completa o que faltar pro quiz funcionar (emojis, ligação opção → perfil, mensagens do WhatsApp).
// A IA devolve um rascunho estruturado (tool use, sempre no formato certo) e aqui ele vira as
// etapas do LeadForm — nome e WhatsApp no começo (1ª mensagem sai na hora), perguntas com emoji
// que pontuam pros resultados, conteúdos de reforço, carregamento, tela de resultado e oferta.
// O usuário depois só ajusta imagens, links e detalhes no editor.

const TOOL = {
  name: "criar_quiz",
  description: "Registra o quiz convertido do material do usuário no formato de quiz em telas.",
  input_schema: {
    type: "object" as const,
    required: ["nomeInterno", "abertura", "perguntas", "resultados", "carregamento", "telaResultado", "oferta", "mensagemWhatsapp", "mensagemFinal"],
    properties: {
      nomeInterno: { type: "string", description: "Nome curto do quiz pra uso interno (ex: Quiz Mentalidade Financeira)" },
      corDestaque: { type: "string", description: "Cor principal em hex #rrggbb que combine com o tema" },
      abertura: {
        type: "object", required: ["titulo", "texto", "botao"],
        properties: {
          titulo: { type: "string", description: "Título chamativo da 1ª tela. Pode usar ==palavra== pra destacar na cor do quiz e [vermelho]...[/vermelho] / [verde]...[/verde]." },
          texto: { type: "string", description: "1-2 frases explicando o que a pessoa ganha ao responder" },
          botao: { type: "string", description: "Texto do botão (ex: Começar o teste)" },
        },
      },
      perguntas: {
        type: "array", minItems: 1, maxItems: 15,
        description: "As perguntas de múltipla escolha DO MATERIAL, na mesma ordem e com o mesmo texto. Cada opção pontua pra UM resultado (use as keys de resultados).",
        items: {
          type: "object", required: ["pergunta", "opcoes"],
          properties: {
            pergunta: { type: "string", description: "Pergunta curta e direta. Pode usar **negrito**." },
            opcoes: {
              type: "array", minItems: 2, maxItems: 6,
              items: {
                type: "object", required: ["texto", "emoji", "resultado"],
                properties: {
                  texto: { type: "string", description: "Texto da opção, copiado do roteiro sem resumir nem cortar (até 150 caracteres)" },
                  emoji: { type: "string", description: "Um único emoji que represente a opção" },
                  resultado: { type: "string", description: "key do resultado que essa opção pontua" },
                },
              },
            },
          },
        },
      },
      conteudos: {
        type: "array", maxItems: 6,
        description: "Telas de conteúdo/reforço que EXISTEM no material (textos entre as perguntas). Se o material não tiver nenhuma, devolva lista vazia.",
        items: {
          type: "object", required: ["depoisDaPergunta", "titulo", "destaqueTitulo", "destaqueTexto", "cor"],
          properties: {
            depoisDaPergunta: { type: "integer", description: "Mostrar depois da pergunta de número N (1 = primeira)" },
            titulo: { type: "string" },
            destaqueTitulo: { type: "string", description: "Título da caixa de destaque" },
            destaqueTexto: { type: "string", description: "Texto da caixa de destaque (1-2 frases)" },
            cor: { type: "string", enum: [...DESTAQUE_CORES] },
          },
        },
      },
      resultados: {
        type: "array", minItems: 2, maxItems: 6,
        description: "Os resultados/perfis do material. Se o material não definir resultados, derive 2 a 3 perfis coerentes com as perguntas.",
        items: {
          type: "object", required: ["key", "titulo", "descricao", "nivel", "mensagemWhatsapp"],
          properties: {
            key: { type: "string", description: "Identificador curto sem espaço (ex: iniciante)" },
            titulo: { type: "string", description: "Nome do perfil (ex: Comercial no improviso)" },
            descricao: { type: "string", description: "2-3 frases explicando o perfil e o próximo passo. Pode usar **negrito**." },
            nivel: { type: "integer", minimum: 1, maximum: 5, description: "Posição no medidor: 1 = mais baixo, 5 = mais alto" },
            mensagemWhatsapp: { type: "string", description: "Mensagem enviada no WhatsApp quando o lead cai nesse perfil. Use {{nome}} e {{resultado}}. Tom humano, curto, termina com uma pergunta." },
          },
        },
      },
      carregamento: { type: "string", description: "Texto da tela de 'calculando...' (ex: Analisando suas respostas...)" },
      telaResultado: {
        type: "object", required: ["titulo", "medidorTitulo", "compEsquerdaTitulo", "compEsquerdaTexto", "compDireitaTitulo", "compDireitaTexto", "metricas"],
        properties: {
          titulo: { type: "string", description: "Título da tela de resultado (pode usar ==destaque==)" },
          medidorTitulo: { type: "string", description: "Rótulo do medidor de nível" },
          compEsquerdaTitulo: { type: "string", description: "Coluna 'antes' (ex: Hoje)" },
          compEsquerdaTexto: { type: "string" },
          compDireitaTitulo: { type: "string", description: "Coluna 'depois' (ex: Com o método)" },
          compDireitaTexto: { type: "string" },
          metricas: {
            type: "array", minItems: 2, maxItems: 4,
            items: {
              type: "object", required: ["nome", "esquerda", "direita"],
              properties: { nome: { type: "string" }, esquerda: { type: "integer", minimum: 0, maximum: 100 }, direita: { type: "integer", minimum: 0, maximum: 100 } },
            },
          },
        },
      },
      oferta: {
        type: "object", required: ["titulo", "texto", "botao"],
        properties: {
          titulo: { type: "string", description: "Título da oferta, pode usar {{nome}} e ==destaque==" },
          texto: { type: "string" },
          botao: { type: "string" },
        },
      },
      mensagemWhatsapp: { type: "string", description: "1ª mensagem enviada assim que o lead informa o WhatsApp (antes de terminar o quiz). Use {{nome}}. Curta." },
      mensagemFinal: { type: "string", description: "Texto curto da tela final" },
    },
  },
};

type Rascunho = {
  nomeInterno: string; corDestaque?: string;
  abertura: { titulo: string; texto: string; botao: string };
  perguntas: { pergunta: string; opcoes: { texto: string; emoji: string; resultado: string }[] }[];
  conteudos?: { depoisDaPergunta: number; titulo: string; destaqueTitulo: string; destaqueTexto: string; cor: string }[];
  resultados: { key: string; titulo: string; descricao: string; nivel: number; mensagemWhatsapp: string }[];
  carregamento: string;
  telaResultado: { titulo: string; medidorTitulo: string; compEsquerdaTitulo: string; compEsquerdaTexto: string; compDireitaTitulo: string; compDireitaTexto: string; metricas: { nome: string; esquerda: number; direita: number }[] };
  oferta: { titulo: string; texto: string; botao: string };
  mensagemWhatsapp: string; mensagemFinal: string;
};

const corta = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

function montar(r: Rascunho) {
  // keys de resultado seguras e únicas
  const keys = new Map<string, string>();
  const quizResults: QuizResult[] = r.resultados.slice(0, 6).map((res, i) => {
    let k = corta(res.key, 30).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `r${i + 1}`;
    while ([...keys.values()].includes(k)) k = `${k}_${i}`;
    keys.set(res.key, k);
    return {
      key: k, titulo: corta(res.titulo, 80), descricao: corta(res.descricao, 1000), mensagem: corta(res.mensagemWhatsapp, 1000),
      etiquetaId: null, pipelineStageId: null, conversionUrl: "", nivel: Math.min(5, Math.max(1, Math.round(Number(res.nivel) || 1))),
    };
  });

  const steps: QuizStep[] = [];
  steps.push({
    id: "s-intro", type: "conteudo", titulo: corta(r.abertura.titulo, 400), texto: corta(r.abertura.texto, 2000),
    destaqueTitulo: "", destaqueTexto: "", destaqueCor: "azul", botao: corta(r.abertura.botao, 40) || "Começar",
  });
  steps.push({ id: "s-nome", type: "pergunta", question: { key: "nome", label: "Antes de começar, qual é o seu nome?", type: "TEXTO" } });
  steps.push({
    id: "s-whatsapp", type: "pergunta",
    question: { key: "whatsapp", label: "{{nome}}, qual o seu WhatsApp com DDD?", subtitulo: "Seu resultado também chega por lá.", type: "WHATSAPP" },
  });

  const conteudos = (r.conteudos ?? []).slice(0, 6);
  // Só perguntas de escolha de verdade: a IA às vezes traz do roteiro "qual seu nome/WhatsApp?" sem
  // opções — essas são descartadas (o quiz já pede nome e WhatsApp no começo)
  const perguntas = r.perguntas
    .map(p => {
      const vistos = new Set<string>();
      const opcoes = (p.opcoes ?? []).slice(0, 6)
        .map(o => ({ ...o, texto: corta(o.texto, MAX_OPCAO_CHARS) }))
        .filter(o => o.texto && !vistos.has(o.texto) && vistos.add(o.texto));
      return { ...p, opcoes };
    })
    .filter(p => p.opcoes.length >= 2 && corta(p.pergunta, 200))
    .slice(0, 15);
  if (perguntas.length === 0) throw new Error("Não encontrei perguntas com opções no roteiro. Confira se cada pergunta tem pelo menos 2 opções.");

  perguntas.forEach((p, i) => {
    const opcoes = p.opcoes;
    steps.push({
      id: `s-p${i + 1}`, type: "pergunta",
      question: {
        key: `p${i + 1}`, label: corta(p.pergunta, 200), type: "ESCOLHA", layout: "lista",
        options: opcoes.map(o => o.texto),
        optionMedia: Object.fromEntries(opcoes.map(o => [o.texto, { emoji: corta(o.emoji, 8) }])),
        optionResults: Object.fromEntries(opcoes.filter(o => keys.has(o.resultado)).map(o => [o.texto, keys.get(o.resultado)!])),
      },
    });
    conteudos.filter(c => Number(c.depoisDaPergunta) === i + 1).forEach((c, j) => {
      steps.push({
        id: `s-c${i + 1}-${j}`, type: "conteudo", titulo: corta(c.titulo, 400), texto: "",
        destaqueTitulo: corta(c.destaqueTitulo, 200), destaqueTexto: corta(c.destaqueTexto, 1000),
        destaqueCor: (DESTAQUE_CORES as readonly string[]).includes(c.cor) ? (c.cor as DestaqueCor) : "vermelho", botao: "Continuar",
      });
    });
  });

  steps.push({ id: "s-calculando", type: "carregamento", texto: corta(r.carregamento, 200) || "Analisando suas respostas...", segundos: 5 });
  const tr = r.telaResultado;
  steps.push({
    id: "s-resultado", type: "resultado", titulo: corta(tr.titulo, 400), medidorTitulo: corta(tr.medidorTitulo, 120), niveis: [...DEFAULT_NIVEIS],
    compEsquerdaTitulo: corta(tr.compEsquerdaTitulo, 60), compEsquerdaTexto: corta(tr.compEsquerdaTexto, 400),
    compDireitaTitulo: corta(tr.compDireitaTitulo, 60), compDireitaTexto: corta(tr.compDireitaTexto, 400),
    metricas: (tr.metricas ?? []).slice(0, 4).map(m => ({
      nome: corta(m.nome, 60) || "Indicador",
      esquerda: Math.min(100, Math.max(0, Math.round(Number(m.esquerda) || 0))),
      direita: Math.min(100, Math.max(0, Math.round(Number(m.direita) || 0))),
    })),
    botao: "Ver minha oferta",
  });
  // Sem link: o usuário coloca o checkout/página depois (ou troca por uma tela de Checkout)
  steps.push({ id: "s-oferta", type: "oferta", titulo: corta(r.oferta.titulo, 400), texto: corta(r.oferta.texto, 2000), botao: corta(r.oferta.botao, 40) || "Quero agora", url: "" });

  return {
    title: corta(r.nomeInterno, 120) || "Quiz gerado com IA",
    headline: corta(r.abertura.titulo, 1000).replace(/==|\*\*|\[\/?(vermelho|verde)\]/g, "") || "Quiz",
    style: "TELAS" as const,
    steps,
    questions: stepsToQuestions(steps),
    quizResults,
    accentColor: /^#[0-9a-fA-F]{6}$/.test(r.corDestaque ?? "") ? r.corDestaque! : "#1d4ed8",
    inviteMessage: corta(r.mensagemWhatsapp, 1000) || null,
    doneMessage: corta(r.mensagemFinal, 1000) || null,
  };
}

export async function gerarQuizComIA(material: string): Promise<{
  quiz: ReturnType<typeof montar>; usage: { inputTokens: number; outputTokens: number }; provider: "anthropic" | "openai"; model: string;
}> {
  const system =
    "Você converte um roteiro/prompt de quiz que o usuário JÁ ESCREVEU para o formato de quiz em telas. NÃO crie um quiz novo: " +
    "use as perguntas, opções, resultados, títulos e textos do material, na mesma ordem e com as mesmas palavras (pode só corrigir " +
    "erros de digitação). Não acrescente perguntas, opções ou telas que não estejam no material. Só complete o que faltar pro quiz " +
    "funcionar: emoji de cada opção, qual resultado cada opção pontua (deduza pelo sentido), nível de cada resultado no medidor " +
    "(1 = mais crítico), mensagens do WhatsApp e textos de abertura/carregamento/resultado/oferta quando o material não trouxer. " +
    "Perguntas de nome, telefone, WhatsApp ou e-mail do material NÃO entram em perguntas (o sistema já pede nome e WhatsApp no início). " +
    "Nunca invente estatísticas com números exatos nem depoimentos com nomes de pessoas. Português do Brasil.";
  const user = `Converta este material em quiz:\n\n<material>\n${material}\n</material>`;

  // Claude quando houver chave (escreve melhor); senão OpenAI — a mesma usada pelo agente do WhatsApp
  let rascunho: Rascunho;
  let usage: { inputTokens: number; outputTokens: number };
  let provider: "anthropic" | "openai";
  let model: string;
  if (process.env.ANTHROPIC_API_KEY) {
    const res = await anthropic.messages.create({
      model: CLAUDE_MODEL, max_tokens: 10000, tools: [TOOL], tool_choice: { type: "tool", name: TOOL.name },
      system, messages: [{ role: "user", content: user }],
    });
    const bloco = res.content.find(c => c.type === "tool_use");
    if (!bloco || bloco.type !== "tool_use") throw new Error("A IA não devolveu o quiz. Tente de novo.");
    rascunho = bloco.input as Rascunho;
    usage = { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
    provider = "anthropic"; model = CLAUDE_MODEL;
  } else {
    const res = await openai.chat.completions.create({
      model: OPENAI_MODEL, max_tokens: 10000, temperature: 0.3,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      tools: [{ type: "function", function: { name: TOOL.name, description: TOOL.description, parameters: TOOL.input_schema } }],
      tool_choice: { type: "function", function: { name: TOOL.name } },
    });
    const call = res.choices[0]?.message?.tool_calls?.[0];
    if (!call || call.type !== "function") throw new Error("A IA não devolveu o quiz. Tente de novo.");
    try { rascunho = JSON.parse(call.function.arguments) as Rascunho; } catch { throw new Error("A IA devolveu o quiz incompleto. Tente de novo."); }
    usage = { inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 };
    provider = "openai"; model = OPENAI_MODEL;
  }
  const quiz = montar(rascunho);

  // Mesmas regras do editor — se a IA errou algo, melhor falhar aqui do que salvar um quiz quebrado
  const s = stepsSchema.safeParse(quiz.steps);
  const q = questionsSchema.safeParse(quiz.questions);
  const r = quizResultsSchema.safeParse(quiz.quizResults);
  if (!s.success || !q.success || !r.success) {
    console.error("[lead-form-ai] quiz gerado inválido", s.error?.issues[0], q.error?.issues[0], r.error?.issues[0]);
    throw new Error("O quiz gerado veio incompleto. Tente de novo ou detalhe mais a descrição.");
  }
  return { quiz, usage, provider, model };
}
