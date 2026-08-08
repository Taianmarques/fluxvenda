// RAG sobre as conversas simuladas da tela de Treino — alternativa ao fine-tuning (indisponível
// pra contas novas na OpenAI desde maio/2026). Em vez de treinar um modelo, busca na hora os
// exemplos reais mais parecidos com a mensagem do cliente e injeta como referência no prompt.
import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/lib/openai";

export type Turno = { role: "user" | "assistant"; content: string };

// Valores padrão (usados só se o agente ainda não tiver os campos preenchidos, ex: dado antigo
// antes da migration) — ajustáveis por agente na tela de configuração (ragSimilarityThreshold,
// ragMaxResults). Abaixo do limiar, o exemplo mais parecido ainda é considerado irrelevante.
const DEFAULT_SIMILARITY_THRESHOLD = 0.5;
const DEFAULT_MAX_RESULTS = 2;

// Cenário (a descrição curta que o gestor escreveu) + a primeira fala do cliente — combina a
// intenção resumida com a formulação real, pro embedding capturar os dois sinais.
export function buildEmbeddingText(cenario: string, turnos: Turno[]): string {
  const primeiraFalaCliente = turnos.find(t => t.role === "user")?.content ?? "";
  return `${cenario}\n${primeiraFalaCliente}`;
}

export async function computeAndStoreEmbedding(exampleId: string, cenario: string, turnos: Turno[]): Promise<void> {
  try {
    const embedding = await getEmbedding(buildEmbeddingText(cenario, turnos));
    await prisma.trainingExample.update({ where: { id: exampleId }, data: { embedding } });
  } catch (err) {
    // Não bloqueia o cadastro do exemplo por causa disso — só fica sem embedding até o próximo
    // backfill, o exemplo continua útil pra revisão manual e pra exportação em .jsonl.
    console.error("[training-rag] erro ao calcular embedding:", err);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function retrieveRelevantExamples(
  agentConfigId: string,
  customerMessage: string,
  opts?: { similarityThreshold?: number; maxResults?: number }
): Promise<{ cenario: string; turnos: Turno[] }[]> {
  const threshold = opts?.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const maxResults = opts?.maxResults ?? DEFAULT_MAX_RESULTS;

  const exemplos = await prisma.trainingExample.findMany({
    where: { agentConfigId },
    select: { cenario: true, turnos: true, embedding: true },
  });
  const comEmbedding = exemplos.filter((e): e is typeof e & { embedding: number[] } => Array.isArray(e.embedding));
  if (comEmbedding.length === 0) return [];

  let queryEmbedding: number[];
  try {
    queryEmbedding = await getEmbedding(customerMessage);
  } catch (err) {
    console.error("[training-rag] erro ao gerar embedding da mensagem do cliente:", err);
    return [];
  }

  return comEmbedding
    .map(e => ({ cenario: e.cenario, turnos: e.turnos as unknown as Turno[], score: cosineSimilarity(queryEmbedding, e.embedding) }))
    .filter(e => e.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ cenario, turnos }) => ({ cenario, turnos }));
}

export function buildRagContext(examples: { cenario: string; turnos: Turno[] }[]): string {
  if (examples.length === 0) return "";
  const blocos = examples.map(ex => {
    const linhas = ex.turnos.map(t => `${t.role === "user" ? "Cliente" : "Você"}: ${t.content}`).join("\n");
    return `[${ex.cenario}]\n${linhas}`;
  }).join("\n\n");
  return `\n\nEXEMPLOS DE ATENDIMENTOS REAIS PARECIDOS COM A SITUAÇÃO ATUAL (referência de tom e abordagem — adapte ao contexto real da conversa, não copie literalmente se não encaixar):\n${blocos}`;
}
