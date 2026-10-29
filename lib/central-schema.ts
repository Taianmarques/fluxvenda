import { z } from "zod";
import { ACESSOS, CAMPO_TIPOS, PERFIL_CAMPOS, type PerfilKey } from "@/lib/central-shared";

export const campoSchema = z.object({
  key: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9_]+$/, "A chave do campo só pode ter letras, números e _"),
  label: z.string().trim().min(1, "Todo campo precisa de um rótulo").max(120),
  tipo: z.enum(CAMPO_TIPOS),
  placeholder: z.string().trim().max(300).optional(),
  ajuda: z.string().trim().max(300).optional(),
  opcoes: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
  obrigatorio: z.boolean().default(false),
  perfil: z.enum(PERFIL_CAMPOS.map(c => c.key) as [PerfilKey, ...PerfilKey[]]).optional(),
  maxCaracteres: z.number().int().min(1).max(3000).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const camposSchema = z.array(campoSchema).max(15)
  .refine(cs => new Set(cs.map(c => c.key)).size === cs.length, "Dois campos estão com a mesma chave")
  .refine(cs => cs.every(c => c.tipo !== "select" || (c.opcoes?.length ?? 0) >= 2), "Campo de seleção precisa de pelo menos 2 opções");

export const ferramentaSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, "Identificador: só letras minúsculas, números e hífen")
    .refine(s => !["perfil", "salvos"].includes(s), "Esse identificador é reservado"),
  moduloId: z.string().min(1),
  nome: z.string().trim().min(1, "Dê um nome à ferramenta").max(100),
  descricao: z.string().trim().max(300).default(""),
  objetivo: z.string().trim().max(600).default(""),
  campos: camposSchema,
  prompt: z.string().trim().min(10, "Escreva o prompt interno da ferramenta").max(20000),
  instrucoes: z.string().trim().max(5000).default(""),
  icone: z.string().trim().max(40).default("sparkles"),
  publicada: z.boolean().default(false),
  permitirCopiarPrompt: z.boolean().default(false),
  ordem: z.number().int().min(0).max(1000).default(0),
  comoUsar: z.string().trim().max(2000).default(""),
  formatoResposta: z.string().trim().max(2000).default(""),
  relacionadas: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
  acesso: z.enum(ACESSOS).default("todos"),
  limiteDiario: z.number().int().min(1).max(1000).nullable().default(null),
});

export type FerramentaInput = z.infer<typeof ferramentaSchema>;

export const perfilSchema = z.object(
  Object.fromEntries(PERFIL_CAMPOS.map(c => [c.key, z.string().trim().max(c.tipo === "textarea" ? 2000 : 200).default("")])) as Record<(typeof PERFIL_CAMPOS)[number]["key"], z.ZodDefault<z.ZodString>>,
);
