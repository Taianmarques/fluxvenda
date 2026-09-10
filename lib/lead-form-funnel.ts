import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { FLUXVENDA_TEAM_ID } from "@/lib/internal-agent";
import { openai, MODEL } from "@/lib/openai";

// Normaliza o número digitado no formulário público pro formato que a UazAPI espera (com DDI
// 55). Aceita com ou sem "55", com ou sem o 9º dígito — só garante o prefixo, não corrige o
// resto (o lead pode ter digitado errado; a IA que vai continuar a conversa lida com isso).
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

const CONVITE_TEMPLATE = (nome: string) =>
  `Oi, ${nome.split(" ")[0]}! Vi que você quer entender como aplicar IA no seu comercial. ` +
  `A FluxVenda é um CRM com IA que atende, agenda e vende pelo seu WhatsApp — dá pra testar de graça ` +
  `ou já marcar uma demonstração rápida com a gente. O que prefere?`;

// Reescreve a próxima pergunta usando o que a pessoa já respondeu, pra soar como uma conversa de
// verdade em vez de um formulário engessado (ex: "Prazer, Taian! E qual seu WhatsApp?" em vez de
// sempre a mesma frase fixa). Mantém a intenção da pergunta original — a IA só pode reformular o
// texto, nunca trocar o que está sendo pedido. Se a chamada falhar, cai pro texto original.
export async function gerarProximaPergunta(params: {
  headline: string;
  respondidas: { pergunta: string; resposta: string }[];
  proximaPergunta: string;
}): Promise<string> {
  const { headline, respondidas, proximaPergunta } = params;
  if (respondidas.length === 0) return proximaPergunta;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Você conduz um formulário conversacional curto, em português do Brasil, tom leve e direto — 1 frase, no " +
            "máximo 2. Use a última resposta da pessoa pra criar uma transição natural até a próxima pergunta, sem " +
            "repetir a pergunta anterior nem inventar informação. NUNCA troque o que está sendo pedido na próxima " +
            "pergunta — só reformule o texto dela pra soar natural. No máximo 1 emoji, e só se fizer sentido.",
        },
        {
          role: "user",
          content:
            `Contexto do formulário: ${headline}\n\n` +
            respondidas.map(r => `Pergunta: ${r.pergunta}\nResposta da pessoa: ${r.resposta}`).join("\n\n") +
            `\n\nPróxima pergunta a fazer (mantenha a intenção, pode reformular o texto): ${proximaPergunta}`,
        },
      ],
      max_tokens: 80,
      temperature: 0.7,
    });
    return completion.choices[0]?.message?.content?.trim() || proximaPergunta;
  } catch (err) {
    console.error("[lead-form-funnel] falha ao gerar próxima pergunta:", err);
    return proximaPergunta;
  }
}

// Dispara o convite de teste grátis/demonstração assim que o lead preenche o campo de WhatsApp
// no formulário público — pelo mesmo número/agente multi-setor que a FluxVenda já usa
// internamente (ver lib/internal-agent.ts), então quem responder cai direto na mesma IA que já
// sabe agendar demonstração (AGENDAR_DEMO_TOOLS em lib/agent-engine.ts).
export async function sendTrialInviteToLead(nome: string, whatsappRaw: string): Promise<boolean> {
  const contactNumber = normalizePhone(whatsappRaw);

  const agentConfig = await prisma.agentConfig.findFirst({
    where: { teamId: FLUXVENDA_TEAM_ID, multiAgenteDepartamentos: true },
    select: { id: true, uazapiToken: true },
  });
  if (!agentConfig?.uazapiToken) {
    console.error("[lead-form-funnel] AgentConfig interno da FluxVenda não encontrado ou sem token");
    return false;
  }

  const conversation = await prisma.conversation.upsert({
    where: { agentConfigId_contactNumber: { agentConfigId: agentConfig.id, contactNumber } },
    update: { contactName: nome },
    create: { agentConfigId: agentConfig.id, contactNumber, contactName: nome },
  });

  const texto = CONVITE_TEMPLATE(nome);
  const waMessageId = await sendWhatsAppTextAsTeam(agentConfig.uazapiToken, contactNumber, texto);
  if (!waMessageId) return false;

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", content: texto, waMessageId },
  });

  return true;
}
