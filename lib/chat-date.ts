function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "Hoje" / "Ontem" / data completa (ex: "20 de agosto de 2026") — separador entre mensagens
// de dias diferentes no histórico do chat (estilo WhatsApp Web)
export function formatDateSeparator(date: Date): string {
  const now = new Date();
  if (isSameLocalDay(date, now)) return "Hoje";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export { isSameLocalDay };
