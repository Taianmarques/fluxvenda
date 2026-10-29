import { MAX_CAMPO_VALOR, type CampoFerramenta } from "@/lib/central-shared";

// Valida os valores enviados pelo formulário de uma ferramenta contra os campos dela (obrigatório,
// tamanho, opções e faixa numérica). Ignora chaves que a ferramenta não tem; devolve o primeiro
// erro legível.
export function validarEntradas(campos: CampoFerramenta[], raw: unknown): { ok: true; entradas: Record<string, string> } | { ok: false; error: string } {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const entradas: Record<string, string> = {};
  for (const c of campos) {
    const v = typeof obj[c.key] === "string" ? (obj[c.key] as string).trim() : typeof obj[c.key] === "number" ? String(obj[c.key]) : "";
    if (c.obrigatorio && !v) return { ok: false, error: `Preencha "${c.label}"` };
    if (v.length > Math.min(c.maxCaracteres ?? MAX_CAMPO_VALOR, MAX_CAMPO_VALOR)) return { ok: false, error: `"${c.label}" está longo demais` };
    if (c.tipo === "select" && v && c.opcoes && !c.opcoes.includes(v)) return { ok: false, error: `Escolha uma opção válida em "${c.label}"` };
    if (c.tipo === "numero" && v) {
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n)) return { ok: false, error: `"${c.label}" precisa ser um número` };
      if (c.min != null && n < c.min) return { ok: false, error: `"${c.label}" precisa ser no mínimo ${c.min}` };
      if (c.max != null && n > c.max) return { ok: false, error: `"${c.label}" precisa ser no máximo ${c.max}` };
    }
    entradas[c.key] = v;
  }
  return { ok: true, entradas };
}
