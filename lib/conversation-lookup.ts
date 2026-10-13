import { prisma } from "@/lib/prisma";
import { phoneVariants } from "@/lib/phone-match";

// Procura a conversa de um contato aceitando as variações do mesmo número (com/sem 55, com/sem o
// 9º dígito). Conversa criada à mão ("Novo atendimento", importação de contatos) guarda o número
// como foi digitado, enquanto o WhatsApp entrega 55 + DDD + número — comparar o texto exato abria
// uma segunda conversa quando o cliente respondia. Se por histórico já existirem duas, prefere a
// que tem exatamente o número recebido (onde as respostas já vinham caindo) e, senão, a mais recente.
export async function findConversationByPhone(agentConfigId: string, rawNumber: string) {
  const variants = phoneVariants(rawNumber);
  if (variants.length === 0) return null;
  const matches = await prisma.conversation.findMany({
    where: { agentConfigId, contactNumber: { in: variants } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  if (matches.length <= 1) return matches[0] ?? null;
  const digits = rawNumber.replace(/\D/g, "");
  return matches.find(m => m.contactNumber === digits) ?? matches[0];
}
