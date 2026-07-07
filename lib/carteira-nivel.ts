// Cálculo do nível de prioridade do cliente (A/B/C/Inativo/Perdido/Prospecto) — mesma régua
// RFM usada na aba Carteira (frequência e valor nos últimos 180 dias, percentis adaptativos
// à própria carteira). Compartilhado pelo filtro de audiência de Campanhas.

export type Nivel = "A" | "B" | "C" | "INATIVO" | "PERDIDO" | "PROSPECTO";

export type ClienteParaNivel = {
  contactNumber: string;
  nivelManual: string | null;
  compras: { at: Date; valor: number }[];
};

export function calcularNiveis(clientes: ClienteParaNivel[], inativoDias: number): Map<string, Nivel> {
  const now = Date.now();
  const d180 = now - 180 * 86400000;

  const base = clientes.map(c => {
    const compras180 = c.compras.filter(x => x.at.getTime() >= d180);
    const lastPurchaseAt = c.compras.length > 0
      ? c.compras.reduce((max, x) => (x.at.getTime() > max ? x.at.getTime() : max), 0)
      : null;
    return {
      contactNumber: c.contactNumber,
      nivelManual: c.nivelManual,
      lastPurchaseAt,
      valor180: compras180.reduce((s, x) => s + x.valor, 0),
      freq180: compras180.length,
    };
  });

  const ativos = base.filter(c => c.lastPurchaseAt !== null && (now - c.lastPurchaseAt) / 86400000 <= inativoDias);
  const valores = ativos.map(c => c.valor180).sort((a, b) => a - b);
  const pct = (p: number) => valores.length > 0 ? valores[Math.min(valores.length - 1, Math.floor(valores.length * p))] : 0;
  const p75 = pct(0.75);
  const mediana = pct(0.5);

  const result = new Map<string, Nivel>();
  for (const c of base) {
    if (c.nivelManual) { result.set(c.contactNumber, c.nivelManual as Nivel); continue; }
    if (c.lastPurchaseAt === null) { result.set(c.contactNumber, "PROSPECTO"); continue; }
    const dias = (now - c.lastPurchaseAt) / 86400000;
    if (dias > 180) { result.set(c.contactNumber, "PERDIDO"); continue; }
    if (dias > inativoDias) { result.set(c.contactNumber, "INATIVO"); continue; }
    if (c.freq180 >= 3 && c.valor180 >= p75 && p75 > 0) result.set(c.contactNumber, "A");
    else if (c.freq180 >= 2 || (c.valor180 >= mediana && mediana > 0)) result.set(c.contactNumber, "B");
    else result.set(c.contactNumber, "C");
  }
  return result;
}
