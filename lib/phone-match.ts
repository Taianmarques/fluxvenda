// Forma canônica de um número de WhatsApp brasileiro pra comparação: só dígitos, com DDI 55 e
// sem o 9º dígito de celular. O mesmo aparelho chega da UazAPI ora com o 9 (13 dígitos), ora sem
// (12 dígitos), e quem cadastra costuma digitar sem o DDI — comparar o texto cru falha.
export function canonicalBrPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length === 13 && digits.startsWith("55") && digits[4] === "9" && /[6-9]/.test(digits[5])) {
    digits = digits.slice(0, 4) + digits.slice(5);
  }
  return digits;
}

export function samePhone(a: string, b: string): boolean {
  return canonicalBrPhone(a) === canonicalBrPhone(b);
}

export function phoneInList(list: string[], number: string): boolean {
  return list.some(n => samePhone(n, number));
}

// Garante o DDI 55 (quem cadastra um contato costuma digitar só DDD + número, e a UazAPI entrega
// sempre com 55 — guardar sem o prefixo faz a resposta do cliente abrir uma conversa duplicada).
export function withDdi(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

// Todas as formas em que o mesmo aparelho pode estar gravado em Conversation.contactNumber:
// com/sem DDI e com/sem o 9º dígito. Usado pra achar a conversa já existente antes de criar outra.
// O 9 só é "inserido" em celular antigo (1º dígito 6-9 depois do DDD) — nunca em telefone fixo.
export function phoneVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const base = withDdi(digits);
  const out = new Set<string>([digits, base]);
  if (base.startsWith("55")) {
    out.add(base.slice(2));
    if (base.length === 13 && base[4] === "9" && /[6-9]/.test(base[5])) {
      const sem9 = base.slice(0, 4) + base.slice(5);
      out.add(sem9);
      out.add(sem9.slice(2));
    } else if (base.length === 12 && /[6-9]/.test(base[4])) {
      const com9 = base.slice(0, 4) + "9" + base.slice(4);
      out.add(com9);
      out.add(com9.slice(2));
    }
  }
  return [...out].filter(Boolean);
}