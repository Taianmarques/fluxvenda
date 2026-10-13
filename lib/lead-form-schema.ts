import { z } from "zod";
import { QUESTION_TYPES, MAX_OPCOES_ESCOLHA, isHttpUrl, isValidHexColor } from "@/lib/lead-form-shared";

// Validação compartilhada dos campos do formulário (editor do super admin e do CRM)

export const questionSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().trim().min(1, "Toda pergunta precisa de um texto").max(200),
  type: z.enum(QUESTION_TYPES),
  options: z.array(z.string().trim().min(1).max(60)).max(MAX_OPCOES_ESCOLHA).optional(),
}).refine(q => q.type !== "ESCOLHA" || (q.options?.length ?? 0) >= 2, "Pergunta de escolha precisa de pelo menos 2 opções");

export const questionsSchema = z.array(questionSchema).min(1).max(10)
  .refine(qs => new Set(qs.map(q => q.key)).size === qs.length, "Perguntas com identificador repetido");

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

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
  consentText: z.preprocess(emptyToNull, z.string().trim().max(500).nullable().optional()),
};
