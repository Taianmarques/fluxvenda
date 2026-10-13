// Tipos e helpers dos formulários de captação que rodam tanto no servidor quanto no navegador
// (sem prisma/server-only) — usados pela página pública, pelos editores e pelas APIs.

export const QUESTION_TYPES = ["TEXTO", "WHATSAPP", "EMAIL", "NUMERO", "ESCOLHA"] as const;
export type LeadFormQuestionType = (typeof QUESTION_TYPES)[number];

export type LeadFormQuestion = {
  key: string;
  label: string;
  type: LeadFormQuestionType;
  options?: string[]; // só ESCOLHA: alternativas mostradas como botões
  // Só ESCOLHA em modo quiz: opção → key do resultado que ela pontua (opção sem entrada não pontua)
  optionResults?: Record<string, string>;
  imageUrl?: string; // imagem ilustrativa mostrada junto da pergunta (/api/formularios/imagem/...)
  // Só no quiz em telas:
  subtitulo?: string;
  layout?: "lista" | "grade"; // ESCOLHA: lista de cartões (emoji/ícone) ou grade de fotos
  optionMedia?: Record<string, { emoji?: string; imageUrl?: string }>; // opção → emoji ou foto
};

// ---- Quiz em telas (LeadForm.style = "TELAS") ----

export const FORM_STYLES = ["CHAT", "TELAS"] as const;
export type FormStyle = (typeof FORM_STYLES)[number];

export const DESTAQUE_CORES = ["vermelho", "verde", "azul", "amarelo"] as const;
export type DestaqueCor = (typeof DESTAQUE_CORES)[number];

export type QuizStep =
  | { id: string; type: "pergunta"; question: LeadFormQuestion }
  | {
      id: string; type: "conteudo"; titulo: string; texto: string; imageUrl?: string;
      destaqueTitulo: string; destaqueTexto: string; destaqueCor: DestaqueCor; botao: string;
    }
  | { id: string; type: "carregamento"; texto: string; segundos: number }
  | { id: string; type: "oferta"; titulo: string; texto: string; imageUrl?: string; botao: string; url: string };

export type QuizStepType = QuizStep["type"];

export function normalizeSteps(raw: unknown): QuizStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is QuizStep =>
    Boolean(s) && typeof s === "object" && typeof (s as { id?: unknown }).id === "string"
    && ["pergunta", "conteudo", "carregamento", "oferta"].includes((s as { type?: unknown }).type as string)
    && ((s as { type: string }).type !== "pergunta" || Boolean((s as { question?: { key?: unknown } }).question?.key)));
}

// No quiz em telas as perguntas vivem dentro das etapas — o resto do sistema (respostas, funil,
// desempenho, CSV) continua lendo LeadForm.questions, derivado daqui ao salvar.
export function stepsToQuestions(steps: QuizStep[]): LeadFormQuestion[] {
  return steps.flatMap(s => (s.type === "pergunta" ? [s.question] : []));
}

// Marcação simples dos títulos/textos do quiz em telas: **negrito**, ==destaque== (cor do
// formulário), [vermelho]...[/vermelho] e [verde]...[/verde], {{nome}} = primeiro nome.
export type RichPart = { text: string; bold?: boolean; color?: "accent" | "vermelho" | "verde" };
export function parseRich(text: string, nome?: string | null): RichPart[] {
  const src = text.replace(/\{\{\s*nome\s*\}\}/gi, (nome ?? "").split(" ")[0] || "");
  const re = /\*\*(.+?)\*\*|==(.+?)==|\[(vermelho|verde)\]([\s\S]+?)\[\/\3\]/g;
  const parts: RichPart[] = [];
  let last = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m.index > last) parts.push({ text: src.slice(last, m.index) });
    if (m[1] !== undefined) parts.push({ text: m[1], bold: true });
    else if (m[2] !== undefined) parts.push({ text: m[2], color: "accent" });
    else parts.push({ text: m[4], color: m[3] as "vermelho" | "verde" });
    last = re.lastIndex;
  }
  if (last < src.length) parts.push({ text: src.slice(last) });
  return parts;
}

// Quiz de perfil: cada resultado tem o que mostrar na tela final e o que fazer com o lead
export type QuizResult = {
  key: string;
  titulo: string;
  descricao: string;
  mensagem: string;              // 1ª mensagem no WhatsApp pra quem caiu aqui ("" = a do formulário)
  etiquetaId: string | null;     // "" / null = a do formulário
  pipelineStageId: string | null;
  conversionUrl: string;         // "" = a página de conversão do formulário
};

export const MAX_QUIZ_RESULTS = 6;

export function normalizeQuizResults(raw: unknown): QuizResult[] {
  if (!Array.isArray(raw)) return [];
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return raw
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object" && typeof (r as { key?: unknown }).key === "string")
    .map(r => ({
      key: str(r.key),
      titulo: str(r.titulo),
      descricao: str(r.descricao),
      mensagem: str(r.mensagem),
      etiquetaId: str(r.etiquetaId) || null,
      pipelineStageId: str(r.pipelineStageId) || null,
      conversionUrl: str(r.conversionUrl),
    }));
}

// Soma 1 ponto por resposta de escolha pro resultado ligado à opção escolhida. Vence quem somar
// mais; empate fica com o que vem primeiro na lista. Ninguém pontuou = primeiro resultado.
export function computeQuizResult(
  questions: LeadFormQuestion[], results: QuizResult[], answers: Record<string, string>,
): QuizResult | null {
  if (results.length === 0) return null;
  const pontos = new Map(results.map(r => [r.key, 0]));
  for (const q of questions) {
    if (q.type !== "ESCOLHA" || !q.optionResults) continue;
    const alvo = q.optionResults[answers[q.key] ?? ""];
    if (alvo && pontos.has(alvo)) pontos.set(alvo, pontos.get(alvo)! + 1);
  }
  let melhor = results[0];
  for (const r of results) if (pontos.get(r.key)! > pontos.get(melhor.key)!) melhor = r;
  return melhor;
}

export function isQuizScoring(q: LeadFormQuestion): boolean {
  return q.type === "ESCOLHA" && Object.keys(q.optionResults ?? {}).length > 0;
}

// Configuração mínima do quiz. A pergunta de WhatsApp pode vir em qualquer posição: antes das
// perguntas do quiz, a 1ª mensagem sai na hora e o resultado vai numa 2ª mensagem ao terminar;
// depois delas, a 1ª mensagem já sai com o resultado.
export function quizOrderError(questions: LeadFormQuestion[], results: QuizResult[]): string | null {
  if (results.length === 0) return null;
  if (results.length < 2) return "O quiz precisa de pelo menos 2 resultados.";
  if (results.some(r => !r.titulo.trim())) return "Todo resultado do quiz precisa de um título.";
  if (!questions.some(isQuizScoring)) return "No quiz, ligue as opções de pelo menos uma pergunta de escolha a um resultado.";
  return null;
}

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

// {{nome}} = primeiro nome do lead; {{link}} = botão/link da isca (LeadForm.ctaUrl);
// {{resultado}} = título do resultado do quiz
export function interpolateTexto(texto: string, vars: { nome: string; link?: string | null; resultado?: string | null }): string {
  return texto
    .replace(/\{\{\s*nome\s*\}\}/gi, vars.nome.split(" ")[0])
    .replace(/\{\{\s*link\s*\}\}/gi, vars.link ?? "")
    .replace(/\{\{\s*resultado\s*\}\}/gi, vars.resultado ?? "");
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
  conversionUrl: string | null; conversionEvent: string | null;
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
    conversionUrl: f.conversionUrl ?? "",
    conversionEvent: f.conversionEvent ?? DEFAULT_CONVERSION_EVENT,
    consentText: f.consentText ?? "",
    etiquetaId: f.etiquetaId,
    pipelineStageId: f.pipelineStageId,
  };
}

// Página de conversão em site externo: ao concluir, o lead é levado pra URL informada e o dono
// instala lá o pixel com o evento escolhido (o pixel só enxerga páginas onde está instalado).
export const CONVERSION_EVENTS = [
  { value: "Lead", label: "Lead (cadastro)" },
  { value: "CompleteRegistration", label: "Cadastro completo" },
  { value: "Schedule", label: "Agendamento" },
  { value: "Contact", label: "Contato" },
  { value: "SubmitApplication", label: "Inscrição enviada" },
  { value: "InitiateCheckout", label: "Início de compra" },
  { value: "Purchase", label: "Compra" },
] as const;
export const DEFAULT_CONVERSION_EVENT = "Lead";

export function isConversionEvent(v: string): boolean {
  return CONVERSION_EVENTS.some(e => e.value === v);
}

// Leva junto o que identifica a campanha (fbclid e utm_*) pra atribuição seguir até o outro site
const CARRY_PARAMS = ["fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "src"];
export function withTrackingParams(url: string, search: string): string {
  try {
    const u = new URL(url);
    const from = new URLSearchParams(search);
    for (const k of CARRY_PARAMS) {
      const v = from.get(k);
      if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
    }
    return u.toString();
  } catch {
    return url;
  }
}

// Código pra colar no <head> da página de conversão do site externo
export function buildPixelSnippet(pixelId: string, event: string): string {
  return `<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
fbq('track', '${event}');
</script>
<!-- End Meta Pixel -->`;
}