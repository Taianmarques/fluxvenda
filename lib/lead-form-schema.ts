import { z } from "zod";
import { QUESTION_TYPES, MAX_OPCOES_ESCOLHA, MAX_OPCAO_CHARS, MAX_QUIZ_RESULTS, MAX_METRICAS, DESTAQUE_CORES, FORM_STYLES, isHttpUrl, isValidHexColor, isConversionEvent } from "@/lib/lead-form-shared";

// Validação compartilhada dos campos do formulário (editor do super admin e do CRM)

const formImageUrl = z.string().regex(/^\/api\/formularios\/imagem\/[0-9a-f-]{36}\.(jpg|png|webp)$/i, "Imagem inválida");

export const questionSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().trim().min(1, "Toda pergunta precisa de um texto").max(200),
  type: z.enum(QUESTION_TYPES),
  options: z.array(z.string().trim().min(1).max(MAX_OPCAO_CHARS)).max(MAX_OPCOES_ESCOLHA).optional(),
  optionResults: z.record(z.string().max(MAX_OPCAO_CHARS), z.string().min(1).max(40)).optional(),
  // Só imagens enviadas pelo próprio editor — nunca um link externo qualquer
  imageUrl: formImageUrl.optional(),
  subtitulo: z.string().trim().max(300).optional(),
  layout: z.enum(["lista", "grade"]).optional(),
  optionMedia: z.record(z.string().max(MAX_OPCAO_CHARS), z.object({
    emoji: z.string().trim().max(16).optional(),
    imageUrl: formImageUrl.optional(),
  })).optional(),
}).refine(q => q.type !== "ESCOLHA" || (q.options?.length ?? 0) >= 2, "Pergunta de escolha precisa de pelo menos 2 opções");

export const questionsSchema = z.array(questionSchema).min(1).max(25)
  .refine(qs => new Set(qs.map(q => q.key)).size === qs.length, "Perguntas com identificador repetido");

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

// Resultados do quiz de perfil — lista vazia ou null desliga o modo quiz
export const quizResultsSchema = z.array(z.object({
  key: z.string().min(1).max(40),
  titulo: z.string().trim().max(80),
  descricao: z.string().trim().max(1000),
  mensagem: z.string().trim().max(1000),
  etiquetaId: z.preprocess(emptyToNull, z.string().nullable()),
  pipelineStageId: z.preprocess(emptyToNull, z.string().nullable()),
  conversionUrl: z.string().trim().max(500)
    .refine(v => v === "" || isHttpUrl(v), "A página de conversão do resultado precisa começar com http:// ou https://"),
  nivel: z.number().int().min(1).max(10).nullable().optional(),
  imageUrl: formImageUrl.optional(),
})).max(MAX_QUIZ_RESULTS)
  .refine(rs => new Set(rs.map(r => r.key)).size === rs.length, "Resultados do quiz com identificador repetido")
  .nullable().optional();

// Campos de aparência / entrega / plano B / consentimento — todos opcionais, "" vira null
export const extrasShape = {
  accentColor: z.preprocess(emptyToNull, z.string().refine(isValidHexColor, "Cor inválida (use #rrggbb)").nullable().optional()),
  coverUrl: z.string().max(8_000_000).nullable().optional(),
  ctaLabel: z.preprocess(emptyToNull, z.string().trim().max(40).nullable().optional()),
  ctaUrl: z.preprocess(emptyToNull, z.string().trim().max(500).refine(isHttpUrl, "O link do botão precisa começar com http:// ou https://").nullable().optional()),
  waNumber: z.preprocess(
    v => (typeof v === "string" ? (v.replace(/\D/g, "") || null) : v),
    z.string().regex(/^\d{10,13}$/, "WhatsApp do botão inválido — use DDD + número").nullable().optional(),
  ),
  waButtonText: z.preprocess(emptyToNull, z.string().trim().max(40).nullable().optional()),
  conversionUrl: z.preprocess(emptyToNull, z.string().trim().max(500).refine(isHttpUrl, "A página de conversão precisa começar com http:// ou https://").nullable().optional()),
  conversionEvent: z.preprocess(emptyToNull, z.string().refine(isConversionEvent, "Evento do pixel inválido").nullable().optional()),
  consentText: z.preprocess(emptyToNull, z.string().trim().max(500).nullable().optional()),
};

// Quiz em telas: sequência de etapas. As perguntas são validadas de novo por questionsSchema
// depois de derivadas (stepsToQuestions), então aqui a pergunta só precisa do formato básico.
const texto = (max: number) => z.string().trim().max(max);
// Nome de parâmetro de URL do checkout (ex: name, email, phone) — só caracteres seguros
const paramName = z.string().trim().max(40).regex(/^[A-Za-z0-9_.\-\[\]]*$/, "Nome de parâmetro inválido");
export const stepsSchema = z.array(z.discriminatedUnion("type", [
  z.object({ id: z.string().min(1).max(40), type: z.literal("pergunta"), question: questionSchema }),
  z.object({
    id: z.string().min(1).max(40), type: z.literal("conteudo"),
    titulo: texto(400), texto: texto(2000), imageUrl: formImageUrl.optional(),
    destaqueTitulo: texto(200), destaqueTexto: texto(1000), destaqueCor: z.enum(DESTAQUE_CORES), botao: texto(40),
  }),
  z.object({
    id: z.string().min(1).max(40), type: z.literal("carregamento"),
    texto: texto(200), segundos: z.number().int().min(1).max(15),
  }),
  z.object({
    id: z.string().min(1).max(40), type: z.literal("oferta"),
    titulo: texto(400), texto: texto(2000), imageUrl: formImageUrl.optional(), botao: texto(40),
    url: z.string().trim().max(500).refine(v => v === "" || isHttpUrl(v), "O link da oferta precisa começar com http:// ou https://"),
    antesImageUrl: formImageUrl.optional(), depoisImageUrl: formImageUrl.optional(),
    antesLabel: texto(30).optional(), depoisLabel: texto(30).optional(),
    preencher: z.boolean().optional(),
    paramNome: paramName.optional(), paramEmail: paramName.optional(), paramTelefone: paramName.optional(),
  }),
  z.object({
    id: z.string().min(1).max(40), type: z.literal("resultado"),
    titulo: texto(400), medidorTitulo: texto(120),
    niveis: z.array(z.string().trim().min(1).max(30)).min(2).max(7),
    compEsquerdaTitulo: texto(60), compEsquerdaTexto: texto(400), compDireitaTitulo: texto(60), compDireitaTexto: texto(400),
    metricas: z.array(z.object({
      nome: z.string().trim().min(1).max(60), esquerda: z.number().min(0).max(100), direita: z.number().min(0).max(100),
    })).max(MAX_METRICAS),
    botao: texto(40),
  }),
  z.object({
    id: z.string().min(1).max(40), type: z.literal("checkout"),
    titulo: texto(400), produtoNome: z.string().trim().min(1, "Dê um nome ao produto do checkout").max(120),
    produtoImageUrl: formImageUrl.optional(),
    precoDe: z.number().min(0).max(100000), precoPor: z.number().min(5, "O preço do checkout precisa ser de pelo menos R$ 5,00").max(100000),
    parcelasMax: z.number().int().min(1).max(12), parcelasSemJuros: z.number().int().min(1).max(12), jurosPorParcela: z.number().min(0).max(10),
    pix: z.boolean(), cartao: z.boolean(),
    timerMinutos: z.number().int().min(0).max(120), garantiaDias: z.number().int().min(0).max(365), compraSegura: z.boolean(),
    botao: texto(40),
    sucessoTitulo: texto(200), sucessoTexto: texto(1000),
    acessoUrl: z.string().trim().max(500).refine(v => v === "" || isHttpUrl(v), "O link de acesso precisa começar com http:// ou https://"),
    acessoBotao: texto(40), mensagemPago: texto(1000),
  }),
])).max(40)
  .refine(ss => ss.every(s => s.type !== "checkout" || s.pix || s.cartao), "O checkout precisa aceitar Pix ou cartão")
  .refine(ss => new Set(ss.map(s => s.id)).size === ss.length, "Etapas com identificador repetido")
  .refine(ss => ss.some(s => s.type === "pergunta"), "O quiz em telas precisa de pelo menos uma pergunta");

export const styleSchema = z.enum(FORM_STYLES);
