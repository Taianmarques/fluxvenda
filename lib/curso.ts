import { prisma } from "@/lib/prisma";
import { embedDoVideo, type VideoEmbed } from "@/lib/video";

// Dados da área do curso (produtos com formato "curso"): módulos com as aulas e os comandos
// publicados, e o progresso do aluno. O acesso ao produto é checado antes, na página.

export type AulaCurso = { id: string; titulo: string; descricao: string; duracaoMin: number | null; video: VideoEmbed | null };
export type ComandoCurso = { id: string; titulo: string; descricao: string; texto: string };
export type ModuloCurso = { id: string; numero: number; nome: string; descricao: string; aulas: AulaCurso[]; comandos: ComandoCurso[] };

export async function carregarCurso(produtoId: string, userId: string) {
  const modulos = await prisma.centralModulo.findMany({
    where: { produtoId },
    orderBy: { numero: "asc" },
    include: {
      aulas: { where: { publicada: true }, orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] },
      comandos: { where: { publicada: true }, orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] },
    },
  });
  const aulaIds = modulos.flatMap(m => m.aulas.map(a => a.id));
  const concluidas = await prisma.aulaConcluida.findMany({ where: { profileId: userId, aulaId: { in: aulaIds } }, select: { aulaId: true } });

  const resultado: ModuloCurso[] = modulos
    .filter(m => m.aulas.length > 0 || m.comandos.length > 0)
    .map((m, i) => ({
      id: m.id,
      numero: i + 1, // numeração dentro do curso (o numero do banco é global da plataforma)
      nome: m.nome,
      descricao: m.descricao,
      aulas: m.aulas.map(a => ({ id: a.id, titulo: a.titulo, descricao: a.descricao, duracaoMin: a.duracaoMin, video: embedDoVideo(a.videoUrl) })),
      comandos: m.comandos.map(c => ({ id: c.id, titulo: c.titulo, descricao: c.descricao, texto: c.texto })),
    }));
  return { modulos: resultado, concluidas: concluidas.map(c => c.aulaId) };
}
