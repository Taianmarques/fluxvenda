import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { runAgent } from "@/lib/agent-engine";
import { logTokenUsage, isOverQuota } from "@/lib/token-usage";
import { z } from "zod";

const schema = z.object({
  atendenteId: z.string().nullable(), // null = todas as conversas (com ou sem dono)
  inicio: z.string().datetime(),
  fim: z.string().datetime(),
});

const AUDITOR_PROMPT = `Você é um auditor sênior de qualidade de atendimento e vendas por WhatsApp.
Receberá estatísticas e trechos reais de conversas de um período. Produza um relatório de auditoria em português com:

1. RESUMO EXECUTIVO (2-3 frases sobre a qualidade geral)
2. NOTAS de 0 a 10: Cordialidade e tom | Agilidade aparente | Condução comercial (avanço para venda) | Clareza das respostas
3. PONTOS FORTES (bullets curtos, com exemplos citando o cliente quando possível)
4. PONTOS DE MELHORIA (bullets curtos e específicos)
5. SUGESTÕES PRÁTICAS (o que fazer diferente já na próxima conversa)
6. CONVERSAS QUE MERECEM ATENÇÃO do gestor (cite o nome/número do cliente e o porquê em uma frase — ex: cliente esfriou sem follow-up, reclamação sem resposta, oportunidade de venda perdida)

Seja direto, específico e justo — elogie o que foi bem feito e aponte o que custou vendas. Máximo ~400 palavras.`;

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Só o gestor pode gerar auditorias" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (await isOverQuota(config.teamId)) {
    return NextResponse.json({ error: "Cota de IA do plano atingida neste mês." }, { status: 429 });
  }

  const inicio = new Date(body.data.inicio);
  const fim = new Date(body.data.fim);
  const { atendenteId } = body.data;

  // Conversas com atividade no período (do atendente, se filtrado)
  const conversas = await prisma.conversation.findMany({
    where: {
      agentConfigId: agentId,
      ...(atendenteId ? { assignedToId: atendenteId } : {}),
      messages: { some: { createdAt: { gte: inicio, lte: fim } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10, // amostra das mais recentes — controla o tamanho do prompt
    include: {
      messages: {
        where: { createdAt: { gte: inicio, lte: fim } },
        orderBy: { createdAt: "asc" },
        take: 40,
        include: { sender: { select: { name: true } } },
      },
      opportunities: { select: { dealValue: true, wonAt: true } },
    },
  });

  if (conversas.length === 0) {
    return NextResponse.json({ error: "Nenhuma conversa com atividade nesse período para esse filtro." }, { status: 404 });
  }

  // ── Estatísticas do período ──────────────────────────────────────────────
  const [totalConversas, mensagensHumanas, encerradas] = await Promise.all([
    prisma.conversation.count({
      where: {
        agentConfigId: agentId,
        ...(atendenteId ? { assignedToId: atendenteId } : {}),
        messages: { some: { createdAt: { gte: inicio, lte: fim } } },
      },
    }),
    prisma.message.count({
      where: {
        conversation: { agentConfigId: agentId, ...(atendenteId ? { assignedToId: atendenteId } : {}) },
        role: "human",
        ...(atendenteId ? { senderId: atendenteId } : {}),
        createdAt: { gte: inicio, lte: fim },
      },
    }),
    prisma.conversation.findMany({
      where: {
        agentConfigId: agentId,
        ...(atendenteId ? { assignedToId: atendenteId } : {}),
        status: "FINALIZADO",
        encerradaEm: { gte: inicio, lte: fim },
      },
      select: { motivoEncerramento: true },
    }),
  ]);

  const ganhas = conversas.flatMap(c => c.opportunities).filter(o => o.wonAt && new Date(o.wonAt) >= inicio && new Date(o.wonAt) <= fim);
  const valorGanho = ganhas.reduce((s, o) => s + o.dealValue, 0);

  const motivosCount = new Map<string, number>();
  for (const e of encerradas) {
    const base = (e.motivoEncerramento ?? "sem motivo").split(" — ")[0];
    motivosCount.set(base, (motivosCount.get(base) ?? 0) + 1);
  }

  const stats = {
    conversas: totalConversas,
    mensagensEnviadas: mensagensHumanas,
    encerradas: encerradas.length,
    vendasGanhas: ganhas.length,
    valorGanho,
    motivos: Array.from(motivosCount.entries()).map(([motivo, qtd]) => ({ motivo, qtd })).sort((a, b) => b.qtd - a.qtd),
  };

  // ── Transcrições para o auditor ──────────────────────────────────────────
  const transcricoes = conversas.map(c => {
    const linhas = c.messages.map(m => {
      const quem = m.role === "user" ? "CLIENTE" : m.role === "human" ? `ATENDENTE${m.sender?.name ? ` ${m.sender.name}` : ""}` : m.role === "note" ? "NOTA INTERNA" : "IA";
      return `[${quem}] ${m.content.slice(0, 300)}`;
    }).join("\n");
    return `--- Conversa com ${c.contactName || c.contactNumber} (status: ${c.status}${c.motivoEncerramento ? `, encerrada: ${c.motivoEncerramento}` : ""}) ---\n${linhas}`;
  }).join("\n\n");

  const contexto = `PERÍODO: ${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}
FILTRO: ${atendenteId ? "conversas de um atendente específico" : "todas as conversas"}
ESTATÍSTICAS: ${stats.conversas} conversas ativas | ${stats.mensagensEnviadas} mensagens enviadas pelo atendente | ${stats.encerradas} encerradas | ${stats.vendasGanhas} vendas ganhas (R$ ${valorGanho.toFixed(2)})
MOTIVOS DE ENCERRAMENTO: ${stats.motivos.map(m => `${m.motivo}: ${m.qtd}`).join(", ") || "nenhum"}

AMOSTRA DE CONVERSAS (${conversas.length} mais recentes do período):

${transcricoes}`.slice(0, 60_000);

  const result = await runAgent(AUDITOR_PROMPT, [], contexto);
  logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "auditoria", ...result.usage });

  return NextResponse.json({ relatorio: result.reply, stats });
}
