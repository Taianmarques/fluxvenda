import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeamDetailed } from "@/lib/whatsapp";
import { interpolateTexto, type LeadFormUtm } from "@/lib/lead-form-shared";
import { findConversationByPhone } from "@/lib/conversation-lookup";
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

// Padrão dos formulários criados por gestores no CRM (LeadForm.agentOwned) — sem nada sobre o
// teste grátis da FluxVenda, que só faz sentido nos formulários do super admin.
const CONVITE_NEUTRO_TEMPLATE = (nome: string) =>
  `Oi, ${nome.split(" ")[0]}! Recebemos o seu cadastro por aqui. Como posso te ajudar?`;

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

export type SendInviteResult = { ok: true } | { ok: false; error: string };

// Traduz o erro cru da UazAPI numa frase que o gestor entende na lista de respostas
function explicarFalhaEnvio(raw: string | undefined): string {
  if (!raw) return "O WhatsApp não aceitou a mensagem.";
  if (/not on whatsapp/i.test(raw)) return "Esse número não está no WhatsApp (provável erro de digitação).";
  if (/disconnected|not reconnectable/i.test(raw)) return "O WhatsApp do agente está desconectado — reconecte em Canais.";
  return `Falha no envio (${raw.slice(0, 120)}).`;
}

// Dispara a mensagem de abertura assim que o lead preenche o campo de WhatsApp no formulário
// público — pro agente escolhido no formulário (LeadForm.agentConfigId), ou pelo agente interno
// multi-setor que a FluxVenda usa pro seu próprio funil de trial (ver lib/internal-agent.ts)
// quando o formulário não escolheu nenhum. Dali em diante, quem responder cai no atendimento
// normal daquele agente — system prompt, pipeline e follow-ups próprios são o "funil" de cada
// formulário, não algo reimplementado aqui. Devolve o motivo quando não consegue enviar.
export async function sendFormInviteToLead(params: {
  nome: string;
  whatsappRaw: string;
  agentConfigId: string | null;
  inviteMessage: string | null;
  agentOwned?: boolean;
  ctaUrl?: string | null;
  etiquetaId?: string | null;
  pipelineStageId?: string | null;
  formTitle?: string;
  utm?: LeadFormUtm | null;
  quizResultado?: string | null; // título do resultado do quiz — vira {{resultado}} e entra na nota do CRM
}): Promise<SendInviteResult> {
  const { nome, inviteMessage, agentOwned } = params;
  const contactNumber = normalizePhone(params.whatsappRaw);

  const agentConfig = await resolveFormAgent(params.agentConfigId);
  if (!agentConfig) {
    console.error("[lead-form-funnel] agente de destino não encontrado ou sem WhatsApp conectado", params.agentConfigId);
    return { ok: false, error: "O agente não tem um WhatsApp (UazAPI) conectado — conecte em Canais." };
  }

  const existingConversation = await findConversationByPhone(agentConfig.id, contactNumber);
  const conversation = existingConversation
    ? await prisma.conversation.update({ where: { id: existingConversation.id }, data: { contactName: nome } })
    : await prisma.conversation.create({ data: { agentConfigId: agentConfig.id, contactNumber, contactName: nome } });

  const texto = inviteMessage?.trim()
    ? interpolateTexto(inviteMessage, { nome, link: params.ctaUrl, resultado: params.quizResultado })
    : agentOwned ? CONVITE_NEUTRO_TEMPLATE(nome) : CONVITE_TEMPLATE(nome);
  const sent = await sendWhatsAppTextAsTeamDetailed(agentConfig.uazapiToken, contactNumber, texto);
  if (!sent.id) return { ok: false, error: explicarFalhaEnvio(sent.error) };

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", content: texto, waMessageId: sent.id },
  });

  await organizarLeadNoCrm({
    conversationId: conversation.id, agentConfigId: agentConfig.id,
    etiquetaId: params.etiquetaId ?? null, pipelineStageId: params.pipelineStageId ?? null,
    formTitle: params.formTitle, utm: params.utm ?? null, quizResultado: params.quizResultado ?? null,
  }).catch(err => console.error("[lead-form-funnel] falha ao organizar lead no CRM:", err));

  return { ok: true };
}

// Quiz com o WhatsApp pedido no início: a abertura já saiu, então quando o lead termina o quiz
// manda o resultado como mensagem seguinte (se o resultado tiver mensagem), anota na conversa e
// aplica a etiqueta/etapa do resultado — a etapa move a oportunidade aberta que o formulário criou.
export async function sendQuizResultToLead(p: {
  whatsappRaw: string; agentConfigId: string | null; nome: string;
  mensagem: string; resultado: string; ctaUrl: string | null;
  etiquetaId: string | null; pipelineStageId: string | null;
}): Promise<void> {
  const agentConfig = await resolveFormAgent(p.agentConfigId);
  if (!agentConfig) return;
  const conversation = await findConversationByPhone(agentConfig.id, normalizePhone(p.whatsappRaw));
  if (!conversation) return;

  if (p.mensagem.trim()) {
    const texto = interpolateTexto(p.mensagem, { nome: p.nome, link: p.ctaUrl, resultado: p.resultado });
    const sent = await sendWhatsAppTextAsTeamDetailed(agentConfig.uazapiToken, conversation.contactNumber, texto);
    if (sent.id) {
      await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: texto, waMessageId: sent.id } });
    } else {
      console.error("[lead-form-funnel] resultado do quiz não saiu:", sent.error);
    }
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "note", content: `Resultado do quiz: ${p.resultado}.` },
  });

  if (p.etiquetaId) {
    const etiqueta = await prisma.etiqueta.findFirst({ where: { id: p.etiquetaId, agentConfigId: agentConfig.id }, select: { id: true } });
    if (etiqueta) {
      await prisma.conversation.update({ where: { id: conversation.id }, data: { etiquetas: { connect: { id: etiqueta.id } } } });
    }
  }

  if (p.pipelineStageId) {
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: p.pipelineStageId, pipeline: { agentConfigId: agentConfig.id } }, select: { id: true },
    });
    if (stage) {
      const aberta = await prisma.opportunity.findFirst({
        where: { conversationId: conversation.id, wonAt: null, lostAt: null }, select: { id: true, stageId: true },
      });
      if (!aberta) {
        await prisma.opportunity.create({ data: { conversationId: conversation.id, dealValue: 0, title: null, stageId: stage.id } });
      } else if (aberta.stageId !== stage.id) {
        await prisma.opportunity.update({ where: { id: aberta.id }, data: { stageId: stage.id, stageEnteredAt: new Date() } });
      }
    }
  }
}

// Deixa o lead do formulário pronto no CRM: nota com a origem pro atendente, etiqueta da
// campanha e oportunidade na etapa escolhida. Etiqueta/etapa só valem se forem do mesmo agente
// (nunca confia só no id salvo no formulário). Não duplica oportunidade se já houver uma aberta.
async function organizarLeadNoCrm(p: {
  conversationId: string; agentConfigId: string;
  etiquetaId: string | null; pipelineStageId: string | null;
  formTitle?: string; utm: LeadFormUtm | null; quizResultado: string | null;
}) {
  const origem = p.utm
    ? [p.utm.source && `origem ${p.utm.source}`, p.utm.medium && `meio ${p.utm.medium}`, p.utm.campaign && `campanha ${p.utm.campaign}`, p.utm.content && `conteúdo ${p.utm.content}`]
        .filter(Boolean).join(", ")
    : "";
  await prisma.message.create({
    data: {
      conversationId: p.conversationId, role: "note",
      content: `Lead captado pelo formulário${p.formTitle ? ` "${p.formTitle}"` : ""}${origem ? ` — ${origem}` : ""}.${p.quizResultado ? ` Resultado do quiz: ${p.quizResultado}.` : ""}`,
    },
  });

  if (p.etiquetaId) {
    const etiqueta = await prisma.etiqueta.findFirst({ where: { id: p.etiquetaId, agentConfigId: p.agentConfigId }, select: { id: true } });
    if (etiqueta) {
      await prisma.conversation.update({ where: { id: p.conversationId }, data: { etiquetas: { connect: { id: etiqueta.id } } } });
    }
  }

  if (p.pipelineStageId) {
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: p.pipelineStageId, pipeline: { agentConfigId: p.agentConfigId } }, select: { id: true },
    });
    if (stage) {
      const aberta = await prisma.opportunity.findFirst({
        where: { conversationId: p.conversationId, wonAt: null, lostAt: null }, select: { id: true },
      });
      if (!aberta) {
        await prisma.opportunity.create({ data: { conversationId: p.conversationId, dealValue: 0, title: null, stageId: stage.id } });
      }
    }
  }
}