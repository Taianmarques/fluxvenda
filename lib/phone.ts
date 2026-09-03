// Número de WhatsApp brasileiro tem duas fontes de ambiguidade que fazem o MESMO contato virar
// duas Conversation diferentes (Conversation.contactNumber é a chave de dedup): o DDI "55" pode
// vir ou não (mensagem real do WhatsApp sempre traz; atendente digitando manualmente no "Novo
// atendimento" ou numa importação de CSV geralmente não bota), e o celular pode vir com ou sem o
// nono dígito (a UazAPI às vezes reporta o formato antigo de 8 dígitos pro mesmo número real).
// Normaliza pro formato canônico único — 55 + DDD (2) + 9 dígitos — em todo lugar que grava ou
// procura uma conversa por número, pra sempre bater na mesma linha.
export function normalizePhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return digits;

  let rest = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  // DDD (2) + 8 dígitos (celular sem o nono, formato antigo) — insere o 9
  if (rest.length === 10) {
    rest = `${rest.slice(0, 2)}9${rest.slice(2)}`;
  }

  // Só normaliza o padrão esperado de celular (DDD + 9 dígitos = 11) — fixo, número estrangeiro
  // ou entrada fora do padrão volta como veio, só sem mexer no DDI.
  if (rest.length !== 11) return digits;

  return `55${rest}`;
}
