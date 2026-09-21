import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { FLUXVENDA_TEAM_ID } from "@/lib/internal-agent";
import { openai, MODEL } from "@/lib/openai";

// Normaliza o número digitado no formulário público pro formato que a UazAPI espera (com DDI
// 55). Aceita com ou sem "55", com ou sem o 9º dígito — só garante o prefixo, não corrige o
// resto (o lead pode ter digitado errado; a IA que vai continuar a conversa lida com isso).
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

const CONVITE_TEMPLATE = (nome: string) =>
  `Oi, ${nome.split(" ")[0]}! Vi que você quer entender como aplicar IA no seu comercial. ` +
  `A FluxVenda é um CRM com IA que atende, agenda e vende pelo seu WhatsApp.\n\n` +
  `Você pode testar grátis por 7 dias, sem cartão — é só se cadastrar aqui: ${APP_URL}/sign-up?product=crm\n\n` +
  `Ou, se preferir, eu já te agendo uma demonstração rápida com a gente. O que prefere?`;

function interpolateNome(texto: string, nome: string): string {
  return texto.replace(/\{\{\s*nome\s*\}\}/gi, nome.split(" ")[0]);
}

// Resolve o agente de destino de um formulário: o escolhido em LeadForm.agentConfigId, ou o
// agente interno multi-setor da FluxVenda (ver lib/internal-agent.ts) quando o formulário não
// escolheu nenhum — mesmo fallback usado pro convite e pra sequência de follow-up (ver
// app/api/cron/followup/route.ts), pra garantir que os dois sempre mandam pelo mesmo número.
export async function resolveFormAgent(agentConfigId: string | null): Promise<{ id: string; uazapiToken: string } | null> {
  const agentConfig = agentConfigId
    ? await prisma.agentConfig.findUnique({ where: { id: agentConfigId }, select: { id: true, uazapiToken: true } })
    : await prisma.agentConfig.findFirst({
        where: { teamId: FLUXVENDA_TEAM_ID, multiAgenteDepartamentos: true },
        select: { id: true, uazapiToken: true },
      });
  if (!agentConfig?.uazapiToken) return null;
  return { id: agentConfig.id, uazapiToken: agentConfig.uazapiToken };
}

export type FormFunnelStep = { minutos: number; mensagem: string };

// LeadForm.funnelSteps é Json — normaliza pra um formato seguro, descartando entradas inválidas
// em vez de derrubar o cron por causa de um valor salvo errado.
export function normalizeFormFunnelSteps(raw: unknown): FormFunnelStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): FormFunnelStep | null => {
      if (!item || typeof item !== "object") return null;
      const obj = item as { minutos?: unknown; mensagem?: unknown };
      const minutos = Number(obj.minutos);
      const mensagem = typeof obj.mensagem === "string" ? obj.mensagem.trim() : "";
      if (!Number.isFinite(minutos) || minutos <= 0 || !mensagem) return null;
      return { minutos, mensagem };
    })
    .filter((x): x is FormFunnelStep => x !== null);
}

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

// Dispara a mensagem de abertura assim que o lead preenche o campo de WhatsApp no formulário
// público — pro agente escolhido no formulário (LeadForm.agentConfigId), ou pelo agente interno
// multi-setor que a FluxVenda usa pro seu próprio funil de trial (ver lib/internal-agent.ts)
// quando o formulário não escolheu nenhum. Dali em diante, quem responder cai no atendimento
// normal daquele agente — system prompt, pipeline e follow-ups próprios são o "funil" de cada
// formulário, não algo reimplementado aqui.
export async function sendFormInviteToLead(params: {
  nome: string;
  whatsappRaw: string;
  agentConfigId: string | null;
  inviteMessage: string | null;
}): Promise<boolean> {
  const { nome, inviteMessage } = params;
  const contactNumber = normalizePhone(params.whatsappRaw);

  const agentConfig = await resolveFormAgent(params.agentConfigId);
  if (!agentConfig) {
    console.error("[lead-form-funnel] agente de destino não encontrado ou sem WhatsApp conectado", params.agentConfigId);
    return false;
  }

  const conversation = await prisma.conversation.upsert({
    where: { agentConfigId_contactNumber: { agentConfigId: agentConfig.id, contactNumber } },
    update: { contactName: nome },
    create: { agentConfigId: agentConfig.id, contactNumber, contactName: nome },
  });

  const texto = inviteMessage?.trim() ? interpolateNome(inviteMessage, nome) : CONVITE_TEMPLATE(nome);
  const waMessageId = await sendWhatsAppTextAsTeam(agentConfig.uazapiToken, contactNumber, texto);
  if (!waMessageId) return false;

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", content: texto, waMessageId },
  });

  return true;
}
