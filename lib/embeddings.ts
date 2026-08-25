import { openai } from "@/lib/openai";

const EMBEDDING_MODEL = "text-embedding-3-small";

// Usado tanto pra indexar um TreinoExemplo (cenario + primeira fala do cliente) quanto pra
// embedar a mensagem real do cliente em tempo de resposta — mesmo modelo dos dois lados,
// senão a comparação de similaridade não faz sentido.
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.trim().slice(0, 8000); // limite generoso, evita estourar a API à toa
  const result = await openai.embeddings.create({ model: EMBEDDING_MODEL, input });
  return result.data[0].embedding;
}

// Similaridade de cosseno entre dois vetores — calculada em código porque o Postgres
// self-hosted não tem a extensão pgvector instalada; com a base de exemplos por agente
// sendo pequena (dezenas, não milhares), uma varredura linear é suficiente.
// Texto usado pra gerar o embedding de um exemplo de treino — cenário + primeira fala do
// cliente, não a conversa inteira (mantém o vetor focado na situação, não em como ela se
// resolve). Usado tanto ao salvar o exemplo quanto, do outro lado, pra reidratar o texto se
// precisar reprocessar depois.
export function buildTreinoEmbeddingText(cenario: string, turnos: { role: string; content: string }[]): string {
  const primeiraFalaCliente = turnos.find(t => t.role === "user")?.content ?? turnos[0]?.content ?? "";
  return `${cenario}\n${primeiraFalaCliente}`.trim();
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
