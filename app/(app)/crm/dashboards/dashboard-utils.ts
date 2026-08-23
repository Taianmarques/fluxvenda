export const DAY_MS = 24 * 60 * 60 * 1000;

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
