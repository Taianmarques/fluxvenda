// Forma canônica de um número de WhatsApp brasileiro pra comparação: só dígitos, com DDI 55 e
// sem o 9º dígito de celular. O mesmo aparelho chega da UazAPI ora com o 9 (13 dígitos), ora sem
// (12 dígitos), e quem cadastra costuma digitar sem o DDI — comparar o texto cru falha.
function canonicalBrPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length === 13 && digits.startsWith("55") && digits[4] === "9") {
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
