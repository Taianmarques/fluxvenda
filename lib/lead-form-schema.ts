import { z } from "zod";
import { QUESTION_TYPES, MAX_OPCOES_ESCOLHA, MAX_QUIZ_RESULTS, isHttpUrl, isValidHexColor, isConversionEvent } from "@/lib/lead-form-shared";

// Validação compartilhada dos campos do formulário (editor do super admin e do CRM)

export const questionSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().trim().min(1, "Toda pergunta precisa de um texto").max(200),
  type: z.enum(QUESTION_TYPES),
  options: z.array(z.string().trim().min(1).max(60)).max(MAX_OPCOES_ESCOLHA).optional(),
  optionResults: z.record(z.string().max(60), z.string().min(1).max(40)).optional(),
  // Só imagens enviadas pelo próprio editor — nunca um link externo qualquer
  imageUrl: z.string().regex(/^\/api\/formularios\/imagem\/[0-9a-f-]{36}\.(jpg|png|webp)$/i, "Imagem da pergunta inválida").optional(),
}).refine(q => q.type !== "ESCOLHA" || (q.options?.length ?? 0) >= 2, "Pergunta de escolha precisa de pelo menos 2 opções");

export const questionsSchema = z.array(questionSchema).min(1).max(10)
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
