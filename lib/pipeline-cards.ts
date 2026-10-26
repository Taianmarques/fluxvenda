import { prisma } from "@/lib/prisma";

// Resumo das tarefas de cada oportunidade pro card do pipeline: contagem, as primeiras tarefas
// (checklist no card) e a próxima pendente (a de prazo mais próximo). Uma query só, sem N+1 —
// usado pela página do pipeline e pela recarga periódica (/api/agentes/[agentId]/oportunidades).

export const TAREFAS_NO_CARD = 3;

export type CardTask = { id: string; title: string; done: boolean; dueDate: string | null };
export type TaskSummary = { total: number; done: number; items: CardTask[]; next: { title: string; dueDate: string | null } | null };

export async function loadTaskSummaries(oppIds: string[]): Promise<Map<string, TaskSummary>> {
  const map = new Map<string, TaskSummary>();
  if (oppIds.length === 0) return map;

  const tasks = await prisma.opportunityTask.findMany({
    where: { opportunityId: { in: oppIds } },
    select: { id: true, opportunityId: true, title: true, done: true, dueDate: true },
    orderBy: { createdAt: "asc" },
  });

  for (const t of tasks) {
    let s = map.get(t.opportunityId);
    if (!s) { s = { total: 0, done: 0, items: [], next: null }; map.set(t.opportunityId, s); }
    s.total++;
    if (t.done) s.done++;
    if (s.items.length < TAREFAS_NO_CARD) s.items.push({ id: t.id, title: t.title, done: t.done, dueDate: t.dueDate?.toISOString() ?? null });
    // Próxima: pendente com prazo mais cedo; sem prazo só entra se nenhuma pendente tiver prazo
    if (!t.done) {
      const atual = s.next;
      const due = t.dueDate?.toISOString() ?? null;
      if (!atual || (due && (!atual.dueDate || due < atual.dueDate))) s.next = { title: t.title, dueDate: due };
    }
  }
  return map;
}
