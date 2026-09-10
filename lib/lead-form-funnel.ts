import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { FLUXVENDA_TEAM_ID } from "@/lib/internal-agent";

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
