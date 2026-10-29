import { MAX_CAMPO_VALOR, type CampoFerramenta } from "@/lib/central-shared";

// Valida os valores enviados pelo formulário de uma ferramenta contra os campos dela.
// Ignora chaves que a ferramenta não tem; devolve o primeiro erro legível.
export function validarEntradas(campos: CampoFerramenta[], raw: unknown): { ok: true; entradas: Record<string, string> } | { ok: false; error: string } {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const entradas: Record<string, string> = {};
  for (const c of campos) {
    const v = typeof obj[c.key] === "string" ? (obj[c.key] as string).trim() : typeof obj[c.key] === "number" ? String(obj[c.key]) : "";
    if (c.obrigatorio && !v) return { ok: false, error: `Preencha "${c.label}"` };
    if (v.length > MAX_CAMPO_VALOR) return { ok: false, error: `"${c.label}" está longo demais` };
    if (c.tipo === "select" && v && c.opcoes && !c.opcoes.includes(v)) return { ok: false, error: `Escolha uma opção válida em "${c.label}"` };
    entradas[c.key] = v;
  }
  return { ok: true, entradas };
}
