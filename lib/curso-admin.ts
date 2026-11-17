import { z } from "zod";
import { videoValido } from "@/lib/video";

// Validação das aulas e comandos editados no admin (produtos no formato "curso")

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const aulaSchema = z.object({
  titulo: z.string().trim().min(2, "Dê um título à aula").max(160),
  descricao: z.string().trim().max(5000),
  videoUrl: z.preprocess(vazioParaNull, z.string().trim().max(500).refine(videoValido, "Link de vídeo não reconhecido. Use o link do Vimeo (ou YouTube / .mp4).").nullable()),
  duracaoMin: z.preprocess(v => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).max(600).nullable()),
  ordem: z.number().int().min(0).max(1000),
  publicada: z.boolean(),
});

export const comandoSchema = z.object({
  titulo: z.string().trim().min(2, "Dê um título ao comando").max(160),
  descricao: z.string().trim().max(300),
  texto: z.string().trim().min(1, "Escreva o texto do comando").max(10000),
  ordem: z.number().int().min(0).max(1000),
  publicada: z.boolean(),
});
