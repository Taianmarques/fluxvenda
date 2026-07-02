import { openai, MODEL } from "@/lib/openai";
import { AGENT_WIZARD_QUESTIONS, DEFAULT_WIZARD_QUESTIONS } from "@/lib/agent-wizard-questions";

export async function transcribeAudio(fileURL: string, mimetype: string): Promise<string> {
  const res = await fetch(fileURL);
  if (!res.ok) throw new Error(`Erro ao baixar áudio para transcrição: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = mimetype.includes("mpeg") ? "mp3" : mimetype.includes("ogg") ? "ogg" : "wav";
  const file = new File([buffer], `audio.${ext}`, { type: mimetype });

  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "pt",
  });
  return result.text.trim();
}

export type AgentConfigInput = {
  nome: string;
  tom: string;
  servicos: string[];
  objecoes: string[];
  horario: string;
  descricaoEmpresa?: string;
  precos?: string;
  enderecoContato?: string;
  segmento?: string;
  subsegmento?: string;
  empresa?: string;
};

const TOM_LABEL: Record<string, string> = {
  FORMAL: "formal e protocolar",
  PROXIMO: "próximo, descontraído e caloroso",
  CONSULTIVO: "consultivo, atencioso e orientado a entender a necessidade do cliente antes de oferecer algo",
};

// Monta os fatos da empresa de forma determinística (sem reescrita por IA), para garantir que
// nenhum detalhe (preço, endereço, etc.) seja perdido ou parafraseado incorretamente.
function buildFatosEmpresa(config: AgentConfigInput): string {
  const blocos: string[] = [];
  if (config.descricaoEmpresa) blocos.push(`SOBRE A EMPRESA:\n${config.descricaoEmpresa}`);
  if (config.servicos.length) blocos.push(`SERVIÇOS/PRODUTOS OFERECIDOS:\n${config.servicos.map(s => `- ${s}`).join("\n")}`);
  if (config.precos) blocos.push(`PREÇOS E CONDIÇÕES:\n${config.precos}`);
  if (config.horario) blocos.push(`HORÁRIO DE ATENDIMENTO:\n${config.horario}`);
  if (config.enderecoContato) blocos.push(`ENDEREÇO, CONTATO E LINKS:\n${config.enderecoContato}`);
  if (config.objecoes.length) blocos.push(`OBJEÇÕES COMUNS DOS CLIENTES (responda com argumentos realistas):\n${config.objecoes.map(s => `- ${s}`).join("\n")}`);
  return blocos.join("\n\n");
}

export async function generateSystemPrompt(config: AgentConfigInput): Promise<string> {
  const fatosEmpresa = buildFatosEmpresa(config);
  const setor = [config.segmento, config.subsegmento].filter(Boolean).join(" > ");

  const prompt = `Crie um system prompt em português para um agente de IA chamado "${config.nome}" que atende clientes via WhatsApp em nome da empresa "${config.empresa ?? "a empresa"}" (segmento: ${setor || "não informado"}).

Tom de voz do agente: ${TOM_LABEL[config.tom] ?? config.tom}

Fatos sobre a empresa (use exatamente estas informações, sem resumir, sem trocar números/valores/endereços por aproximações):
${fatosEmpresa || "Nenhuma informação adicional fornecida."}

O system prompt final deve:
- abrir com a identidade do agente (nome, empresa, tom de voz)
- incluir, em uma seção separada e claramente identificada, TODOS os fatos acima na íntegra (preços, horário, endereço, serviços, objeções) — não pode perder nenhum dado fornecido
- instruir o agente a se apresentar pelo nome quando relevante
- instruir a entender a necessidade do cliente antes de empurrar venda
- instruir a responder objeções comuns com argumentos realistas baseados nos fatos
- instruir a ser direto e usar mensagens curtas, adequadas ao WhatsApp (poucas frases por resposta)
- instruir a avisar quando estiver fora do horário de atendimento, se perguntado
- instruir a NUNCA inventar preços, endereços, prazos ou qualquer informação que não esteja nos fatos acima — se perguntado algo fora disso, admitir que não tem essa informação e oferecer encaminhar para um humano${setor ? `
- incluir uma seção com 2-4 boas práticas de condução de conversa e qualificação TÍPICAS do subsetor "${setor}" (ex: que perguntas fazer, que sinais de interesse buscar, que próximo passo sugerir) — isso é só sobre COMO conduzir a conversa, nunca para inventar fatos, preços ou políticas específicas dessa empresa que não foram informados acima` : ""}

Responda APENAS com o texto final do system prompt, sem comentários adicionais.`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

const AGENT_TEMPLATE_TOM = ["FORMAL", "PROXIMO", "CONSULTIVO"] as const;

export type AgentTemplateSuggestion = {
  tom: "FORMAL" | "PROXIMO" | "CONSULTIVO";
  servicos: string[];
  objecoes: string[];
  horario: string;
};

// Sugere um ponto de partida (tom, serviços/produtos típicos, objeções comuns, horário
// usual) pra um agente novo com base só no setor — nunca inventa fatos específicos da
// empresa real (preço, endereço, nome de serviço exato): isso o usuário ainda revisa/edita
// antes de salvar.
export async function generateAgentTemplate(segmento: string, subsegmento: string): Promise<AgentTemplateSuggestion> {
  const setor = [segmento, subsegmento].filter(Boolean).join(" > ");
  const q = AGENT_WIZARD_QUESTIONS[segmento] ?? DEFAULT_WIZARD_QUESTIONS;

  const prompt = `Você ajuda a configurar um agente de atendimento via WhatsApp para uma empresa do setor "${setor}".

Sugira um ponto de partida GENÉRICO e típico desse setor (a empresa real vai revisar e ajustar depois), preenchendo exatamente estes campos da wizard:
- tom de voz mais comum nesse setor: FORMAL, PROXIMO ou CONSULTIVO
- de 4 a 6 itens pro campo "${q.servicosLabel}" (nomes curtos e genéricos, não específicos de uma empresa real)
- de 3 a 5 itens pro campo "${q.objecoesLabel}" (curtos, como o cliente diria)
- um valor pro campo "Horário de atendimento" (texto curto, ex: "${q.horarioDefault}")

Responda APENAS em JSON, no formato exato:
{"tom": "FORMAL|PROXIMO|CONSULTIVO", "servicos": ["..."], "objecoes": ["..."], "horario": "..."}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 500,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: any = {};
  try { parsed = JSON.parse(raw); } catch {}

  return {
    tom: AGENT_TEMPLATE_TOM.includes(parsed.tom) ? parsed.tom : "CONSULTIVO",
    servicos: Array.isArray(parsed.servicos) ? parsed.servicos.filter((s: unknown) => typeof s === "string") : [],
    objecoes: Array.isArray(parsed.objecoes) ? parsed.objecoes.filter((s: unknown) => typeof s === "string") : [],
    horario: typeof parsed.horario === "string" ? parsed.horario : "",
  };
}

export async function runAgent(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  newMessage: string
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: newMessage },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "Desculpe, não consegui processar sua mensagem.";
}

// Responde com base numa imagem enviada pelo cliente (foto de produto, comprovante, etc.),
// usando a visão do modelo em vez de transcrever/descrever a imagem em texto antes.
export async function runAgentWithImage(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  imageUrl: string,
  caption: string
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: [
          { type: "text", text: caption || "(o cliente mandou essa imagem sem legenda)" },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "Desculpe, não consegui processar a imagem.";
}

export const SCHEDULING_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "listar_servicos_profissionais",
      description: "Lista os serviços e/ou profissionais disponíveis para agendamento nessa empresa. Use antes de consultar horários, se a empresa trabalhar com serviços ou profissionais diferentes.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_horarios_disponiveis",
      description: "Consulta os horários reais disponíveis para agendamento nos próximos dias. Use SEMPRE antes de propor qualquer data/horário ao cliente — nunca invente horários.",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string", description: "Nome do serviço escolhido pelo cliente, se a empresa trabalhar com serviços" },
          professional: { type: "string", description: "Nome do profissional escolhido pelo cliente, se a empresa trabalhar com profissionais" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "agendar_horario",
      description: "Confirma um agendamento numa data e hora específicas, depois que o cliente escolheu um horário dentre os disponíveis retornados por consultar_horarios_disponiveis.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data no formato YYYY-MM-DD" },
          time: { type: "string", description: "Horário no formato HH:mm" },
          service: { type: "string", description: "Nome do serviço escolhido, se aplicável" },
          professional: { type: "string", description: "Nome do profissional escolhido, se aplicável" },
          notes: { type: "string", description: "Observações sobre o agendamento, se houver" },
        },
        required: ["date", "time"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancelar_agendamento",
      description: "Cancela o próximo agendamento confirmado dessa conversa. Use quando o cliente disser que não pode ir ao compromisso ou pedir para cancelar.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

export const COMMERCE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "consultar_produtos",
      description: "Lista os produtos disponíveis no catálogo dessa empresa, com preço e estoque. Use SEMPRE antes de informar preço ou disponibilidade — nunca invente produto ou valor fora dessa lista.",
      parameters: {
        type: "object",
        properties: { busca: { type: "string", description: "Termo opcional pra filtrar produtos pelo nome" } },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "montar_pedido",
      description: "Cria ou atualiza o pedido em andamento dessa conversa com os itens que o cliente quer comprar. Chame de novo (substituindo a lista inteira de itens) sempre que o cliente mudar o pedido.",
      parameters: {
        type: "object",
        properties: {
          itens: {
            type: "array",
            items: {
              type: "object",
              properties: {
                produto: { type: "string", description: "Nome do produto, igual ao retornado por consultar_produtos" },
                quantidade: { type: "number" },
              },
              required: ["produto", "quantidade"],
            },
          },
        },
        required: ["itens"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "gerar_cobranca",
      description: "Gera a cobrança do pedido atual em andamento dessa conversa, depois que o cliente confirmou os itens, escolheu a forma de pagamento (Pix ou cartão), informou o CPF/CNPJ (exigido pra qualquer cobrança) e — se for cartão e a empresa permitir parcelamento — escolheu em quantas vezes quer pagar. Se for Pix, retorna o código copia-e-cola pra enviar direto no chat. Se for cartão, retorna um link de checkout seguro pro cliente abrir e digitar os dados do cartão lá — NUNCA peça número de cartão pelo WhatsApp.",
      parameters: {
        type: "object",
        properties: {
          formaPagamento: { type: "string", enum: ["PIX", "CARTAO"], description: "Forma de pagamento escolhida pelo cliente" },
          cpfCnpj: { type: "string", description: "CPF ou CNPJ do cliente, só números" },
          parcelas: { type: "number", description: "Número de parcelas escolhido pelo cliente, só pra pagamento com cartão (1 = à vista). Use o limite informado no contexto." },
        },
        required: ["formaPagamento", "cpfCnpj"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_status_pedido",
      description: "Consulta o status do(s) pedido(s) dessa conversa (em preparo, pago, enviado, etc). Use quando o cliente perguntar sobre um pedido já feito.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "enviar_foto_produto",
      description: "Envia a foto de um produto do catálogo direto no WhatsApp. Use quando o cliente pedir pra ver o produto ou perguntar se tem foto.",
      parameters: {
        type: "object",
        properties: { produto: { type: "string", description: "Nome do produto, igual ao retornado por consultar_produtos" } },
        required: ["produto"],
      },
    },
  },
];

export const BILLING_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "consultar_cobrancas",
      description: "Lista as cobranças em aberto ou vencidas do devedor dessa conversa. Use quando o cliente perguntar sobre o que deve ou quiser pagar.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "enviar_boleto",
      description: "Gera (se ainda não gerado) e envia o link do boleto de uma cobrança específica pro devedor via WhatsApp. Use quando o cliente quiser pagar ou pedir o boleto.",
      parameters: {
        type: "object",
        properties: { cobrancaId: { type: "string", description: "ID da cobrança retornado por consultar_cobrancas" } },
        required: ["cobrancaId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_status_boleto",
      description: "Verifica no Asaas se o boleto de uma cobrança foi pago. Use quando o cliente disser que já pagou ou perguntar se o pagamento foi confirmado.",
      parameters: {
        type: "object",
        properties: { cobrancaId: { type: "string", description: "ID da cobrança" } },
        required: ["cobrancaId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "prorrogar_boleto",
      description: "Cancela o boleto atual e emite uma segunda via com nova data de vencimento. Use quando o devedor pedir prazo, segunda via com nova data ou renegociação de vencimento.",
      parameters: {
        type: "object",
        properties: {
          cobrancaId: { type: "string", description: "ID da cobrança" },
          novaData: { type: "string", description: "Nova data de vencimento no formato YYYY-MM-DD" },
        },
        required: ["cobrancaId", "novaData"],
      },
    },
  },
];

export const PROSPECTING_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "registrar_qualificacao",
      description: "Registra o resultado da qualificação do prospect após conduzir o BANT (Budget, Authority, Need, Timeline). Use quando tiver informação suficiente para avaliar o fit.",
      parameters: {
        type: "object",
        properties: {
          nivel: { type: "string", enum: ["QUALIFICADO", "NAO_QUALIFICADO", "REQUER_MAIS_INFO"], description: "Resultado da qualificação" },
          notas: { type: "string", description: "Resumo do que foi levantado: orçamento, autoridade, necessidade, prazo" },
        },
        required: ["nivel"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "encaminhar_para_atendente",
      description: "Encaminha o prospect qualificado para um atendente humano da equipe de vendas. Use somente após registrar_qualificacao com nivel QUALIFICADO.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "registrar_interesse_reuniao",
      description: "Registra que o prospect demonstrou interesse em marcar uma reunião ou demo. Use quando o prospect aceitar uma call ou visita.",
      parameters: {
        type: "object",
        properties: { notas: { type: "string", description: "Preferência de data/horário mencionada, se houver" } },
        required: [],
      },
    },
  },
];

// Roda o agente com acesso a ferramentas (ex: agendamento) — chama o modelo em loop até ele
// parar de pedir ferramentas e devolver uma resposta final em texto.
export async function runAgentWithTools(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  newMessage: string,
  tools: any[],
  executeTool: (name: string, args: any) => Promise<string>
): Promise<string> {
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: newMessage },
  ];

  // 6 rounds (não 3): fluxos de comércio costumam encadear vários tool calls num só turno
  // (consultar produto, montar pedido, gerar cobrança) e ainda precisam de uma rodada extra
  // só para compor a resposta final em texto.
  for (let round = 0; round < 6; round++) {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 400,
      messages,
      tools,
    });
    const msg = completion.choices[0]?.message;
    if (!msg) break;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content?.trim() ?? "Desculpe, não consegui processar sua mensagem.";
    }

    messages.push(msg);
    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      let args: any = {};
      try { args = JSON.parse(call.function.arguments || "{}"); } catch {}
      const result = await executeTool(call.function.name, args);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  return "Desculpe, não consegui processar sua mensagem.";
}

export async function generateFollowupMessage(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  attemptNumber: number
): Promise<string> {
  const instruction = attemptNumber >= 2
    ? "O cliente já não respondeu a um follow-up anterior. Mande uma última mensagem curta e educada, sem ser insistente, dando a entender que essa é a última tentativa de contato."
    : "O cliente não responde há um tempo. Mande uma mensagem curta e natural retomando a conversa, sem ser insistente, baseada no que foi discutido.";

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 200,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: `[Instrução interna — não é uma mensagem do cliente] ${instruction}` },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

// Avalia se o cliente já demonstrou interesse real de compra (lead qualificado) — usado
// pelo modo de distribuição "IA_QUALIFICACAO" pra decidir quando atribuir a um atendente.
export async function classifyLeadQualified(
  history: { role: "user" | "assistant"; content: string }[]
): Promise<boolean> {
  const transcript = history
    .slice(-12)
    .map(m => `${m.role === "user" ? "Cliente" : "Atendimento"}: ${m.content}`)
    .join("\n");

  if (!transcript.trim()) return false;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 5,
    messages: [
      {
        role: "system",
        content: "Você analisa conversas de vendas pelo WhatsApp. Responda APENAS \"sim\" ou \"nao\" (sem pontuação). " +
          "O cliente demonstrou interesse real de compra ou fechamento (perguntou preço/condições com intenção de seguir, disse que quer comprar, pediu pra agendar/fechar, confirmou que vai prosseguir)? " +
          "Pergunta genérica, curiosidade ou só pedir informação não conta como qualificado.",
      },
      { role: "user", content: transcript },
    ],
  });

  const answer = completion.choices[0]?.message?.content?.trim().toLowerCase() ?? "";
  return answer.startsWith("sim");
}
