import { openai, MODEL } from "@/lib/openai";

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
