import { openai, MODEL } from "@/lib/openai";

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

  const prompt = `Crie um system prompt em português para um agente de IA chamado "${config.nome}" que atende clientes via WhatsApp em nome da empresa "${config.empresa ?? "a empresa"}" (segmento: ${config.segmento ?? "não informado"}).

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
- instruir a NUNCA inventar preços, endereços, prazos ou qualquer informação que não esteja nos fatos acima — se perguntado algo fora disso, admitir que não tem essa informação e oferecer encaminhar para um humano

Responda APENAS com o texto final do system prompt, sem comentários adicionais.`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
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
      name: "consultar_horarios_disponiveis",
      description: "Consulta os horários reais disponíveis para agendamento nos próximos dias. Use SEMPRE antes de propor qualquer data/horário ao cliente — nunca invente horários.",
      parameters: { type: "object", properties: {}, required: [] },
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
          notes: { type: "string", description: "Observações sobre o agendamento, se houver" },
        },
        required: ["date", "time"],
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
  tools: typeof SCHEDULING_TOOLS,
  executeTool: (name: string, args: any) => Promise<string>
): Promise<string> {
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: newMessage },
  ];

  for (let round = 0; round < 3; round++) {
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
