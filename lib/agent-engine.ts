import { openai, MODEL } from "@/lib/openai";

export type AgentConfigInput = {
  nome: string;
  tom: string;
  servicos: string[];
  objecoes: string[];
  horario: string;
  segmento?: string;
  empresa?: string;
};

const TOM_LABEL: Record<string, string> = {
  FORMAL: "formal e protocolar",
  PROXIMO: "próximo, descontraído e caloroso",
  CONSULTIVO: "consultivo, atencioso e orientado a entender a necessidade do cliente antes de oferecer algo",
};

export async function generateSystemPrompt(config: AgentConfigInput): Promise<string> {
  const prompt = `Crie um system prompt em português para um agente de IA que atende clientes via WhatsApp em nome da empresa "${config.empresa ?? "a empresa"}" (segmento: ${config.segmento ?? "não informado"}).

Dados do agente:
- Nome: ${config.nome}
- Tom de voz: ${TOM_LABEL[config.tom] ?? config.tom}
- Serviços/produtos oferecidos: ${config.servicos.join(", ") || "não informado"}
- Objeções comuns dos clientes: ${config.objecoes.join(", ") || "não informado"}
- Horário de atendimento: ${config.horario || "não informado"}

O system prompt deve instruir o agente a:
- se apresentar pelo nome quando relevante
- manter o tom de voz indicado
- entender a necessidade do cliente antes de empurrar venda
- responder objeções comuns listadas com argumentos realistas
- ser direto e usar mensagens curtas, adequadas ao WhatsApp (poucas frases por resposta)
- avisar quando estiver fora do horário de atendimento, se perguntado
- nunca inventar informações que não foram fornecidas

Responda APENAS com o texto final do system prompt, sem comentários adicionais.`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 600,
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
