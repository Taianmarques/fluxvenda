// Procura um número de WhatsApp brasileiro digitado em texto livre (DM do Instagram, etc.).
// Heurística: DDD (2 dígitos) + 9º dígito opcional + 8 dígitos, com/sem separadores e código
// do país. Não existe "cartão de contato" estruturado no Instagram Direct pra extrair, então
// isso é aproximado por natureza — pode ocasionalmente casar uma sequência de 10-11 dígitos
// que não é telefone (ex: um número de pedido). Aceitável pro caso de uso: o resultado é só
// disparar uma mensagem de texto amigável, reversível e auditável, nunca uma ação destrutiva.
const PHONE_PATTERN = /(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/g;

export function extractBrazilianPhoneFromText(text: string): string | null {
  const matches = text.match(PHONE_PATTERN);
  if (!matches) return null;

  for (const raw of matches) {
    const digits = raw.replace(/\D/g, "");
    // Se o código do país já veio junto do match, tira pra medir só DDD+número
    const local = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
    if (local.length === 10 || local.length === 11) {
      return `55${local}`;
    }
  }
  return null;
}
