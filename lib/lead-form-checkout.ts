import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { findConversationByPhone } from "@/lib/conversation-lookup";
import { normalizePhone } from "@/lib/lead-form-funnel";
import { FLUXVENDA_TEAM_ID } from "@/lib/internal-agent";
import { normalizeSteps, interpolateTexto, formatBRL, type CheckoutStep } from "@/lib/lead-form-shared";

// Checkout dentro do quiz em telas: a cobrança sai na conta Asaas do agente do formulário (a mesma
// usada nos pedidos pelo WhatsApp). Agente = LeadForm.agentConfigId, ou o agente interno da
// FluxVenda quando o formulário não escolheu nenhum (mesmo fallback do convite).

export async function resolveCheckoutAgent(agentConfigId: string | null) {
  const select = { id: true, uazapiToken: true, asaasApiKey: true, asaasSandbox: true, asaasWebhookToken: true } as const;
  return agentConfigId
    ? prisma.agentConfig.findUnique({ where: { id: agentConfigId }, select })
    : prisma.agentConfig.findFirst({ where: { teamId: FLUXVENDA_TEAM_ID, multiAgenteDepartamentos: true }, select });
}

// Em qual conta Asaas o checkout cobra. Formulário do super admin (agentOwned = false) vende
// produto da própria FluxVenda → conta DA PLATAFORMA (ASAAS_PLATFORM_*, a mesma de créditos e
// planos; confirma pelo webhook /api/webhooks/asaas-plataforma). Formulário criado no CRM →
// conta Asaas do agente do cliente (confirma pelo webhook /api/webhooks/asaas/[agentId]).
export type PaymentAccount = { apiKey: string; sandbox: boolean; agentIdForWebhook: string | null };

export async function resolvePaymentAccount(form: { agentOwned: boolean; agentConfigId: string | null }): Promise<PaymentAccount | null> {
  if (!form.agentOwned) {
    const apiKey = process.env.ASAAS_PLATFORM_API_KEY;
    return apiKey ? { apiKey, sandbox: process.env.ASAAS_PLATFORM_SANDBOX !== "false", agentIdForWebhook: null } : null;
  }
  const agent = await resolveCheckoutAgent(form.agentConfigId);
  if (!agent?.asaasApiKey) return null;
  // Sem token o webhook do agente recusa a confirmação do Pix — gera na primeira cobrança
  if (!agent.asaasWebhookToken) {
    await prisma.agentConfig.update({ where: { id: agent.id }, data: { asaasWebhookToken: randomUUID() } });
  }
  return { apiKey: agent.asaasApiKey, sandbox: agent.asaasSandbox, agentIdForWebhook: agent.id };
}

export function findCheckoutStep(stepsRaw: unknown, stepId: string): CheckoutStep | null {
  const s = normalizeSteps(stepsRaw).find(x => x.id === stepId);
  return s?.type === "checkout" ? s : null;
}

// Pagamento confirmado (cartão aprovado na hora ou Pix pelo webhook). Idempotente: só age na
// primeira confirmação. Marca a resposta como paga, fecha a oportunidade como ganha no CRM,
// deixa uma nota na conversa e manda a mensagem de pagamento confirmado no WhatsApp.
export async function markLeadFormPaid(submissionId: string): Promise<void> {
  const claimed = await prisma.leadFormSubmission.updateMany({
    where: { id: submissionId, NOT: { payStatus: "PAGO" } },
    data: { payStatus: "PAGO", paidAt: new Date() },
  });
  if (claimed.count === 0) return;

  const sub = await prisma.leadFormSubmission.findUnique({
    where: { id: submissionId },
    include: { form: { select: { agentConfigId: true, steps: true, title: true } } },
  });
  if (!sub?.whatsapp) return;

  const agent = await resolveCheckoutAgent(sub.form.agentConfigId);
  if (!agent) return;
  const conversation = await findConversationByPhone(agent.id, normalizePhone(sub.whatsapp));
  if (!conversation) return;

  const valor = (sub.payValueCents ?? 0) / 100;
  const step = normalizeSteps(sub.form.steps).find((s): s is CheckoutStep => s.type === "checkout");

  await prisma.message.create({
    data: {
      conversationId: conversation.id, role: "note",
      content: `Pagamento confirmado no quiz "${sub.form.title}": ${formatBRL(valor)} via ${sub.payMethod === "CARTAO" ? `cartão${(sub.payInstallments ?? 1) > 1 ? ` em ${sub.payInstallments}x` : ""}` : "Pix"}${step ? ` — ${step.produtoNome}` : ""}.`,
    },
  });

  // Oportunidade aberta vira ganha com o valor pago; sem nenhuma aberta, cria uma já ganha
  const aberta = await prisma.opportunity.findFirst({ where: { conversationId: conversation.id, wonAt: null, lostAt: null }, select: { id: true } });
  if (aberta) {
    await prisma.opportunity.update({ where: { id: aberta.id }, data: { wonAt: new Date(), dealValue: valor } });
  } else {
    await prisma.opportunity.create({ data: { conversationId: conversation.id, dealValue: valor, title: step?.produtoNome ?? null, wonAt: new Date() } });
  }

  if (step?.mensagemPago.trim() && agent.uazapiToken) {
    const texto = interpolateTexto(step.mensagemPago, { nome: sub.nome || "tudo bem", link: step.acessoUrl || null });
    await sendWhatsAppTextAsTeam(agent.uazapiToken, conversation.contactNumber, texto).catch(() => {});
    await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: texto } });
  }
}
