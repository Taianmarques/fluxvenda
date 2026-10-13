// Tipos e helpers dos formulários de captação que rodam tanto no servidor quanto no navegador
// (sem prisma/server-only) — usados pela página pública, pelos editores e pelas APIs.

export const QUESTION_TYPES = ["TEXTO", "WHATSAPP", "EMAIL", "NUMERO", "ESCOLHA"] as const;
export type LeadFormQuestionType = (typeof QUESTION_TYPES)[number];

export type LeadFormQuestion = {
  key: string;
  label: string;
  type: LeadFormQuestionType;
  options?: string[]; // só ESCOLHA: alternativas mostradas como botões
};

export const MAX_OPCOES_ESCOLHA = 6;

export const DEFAULT_ACCENT = "#2563eb";

// Origem do lead — parâmetros do link (utm_*, ref, src) + de onde veio o clique
export type LeadFormUtm = {
  source?: string; medium?: string; campaign?: string; content?: string; referrer?: string;
};

export function isValidHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

// Telefone brasileiro digitado à mão: com ou sem 55, 10-11 dígitos de DDD+número
export function isPlausibleBrPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (national.length < 10 || national.length > 11) return false;
  const ddd = Number(national.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  // celular (11 dígitos) começa com 9 depois do DDD
  if (national.length === 11 && national[2] !== "9") return false;
  return true;
}

// {{nome}} = primeiro nome do lead; {{link}} = botão/link da isca (LeadForm.ctaUrl)
export function interpolateTexto(texto: string, vars: { nome: string; link?: string | null }): string {
  return texto
    .replace(/\{\{\s*nome\s*\}\}/gi, vars.nome.split(" ")[0])
    .replace(/\{\{\s*link\s*\}\}/gi, vars.link ?? "");
}

export function buildWaLink(waNumber: string, text?: string): string {
  const digits = waNumber.replace(/\D/g, "");
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

// Só aceita http(s) — o botão final nunca pode virar javascript:/data:
export function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Campos "extras" do LeadForm como o editor os usa (strings vazias no lugar de null)
export type LeadFormExtrasDb = {
  accentColor: string | null; coverUrl: string | null; ctaLabel: string | null; ctaUrl: string | null;
  waNumber: string | null; waButtonText: string | null; consentText: string | null;
  etiquetaId: string | null; pipelineStageId: string | null;
};

export function formToExtras(f: LeadFormExtrasDb) {
  return {
    accentColor: f.accentColor ?? DEFAULT_ACCENT,
    coverUrl: f.coverUrl,
    ctaLabel: f.ctaLabel ?? "",
    ctaUrl: f.ctaUrl ?? "",
    waNumber: f.waNumber ?? "",
    waButtonText: f.waButtonText ?? "",
    consentText: f.consentText ?? "",
    etiquetaId: f.etiquetaId,
    pipelineStageId: f.pipelineStageId,
  };
}