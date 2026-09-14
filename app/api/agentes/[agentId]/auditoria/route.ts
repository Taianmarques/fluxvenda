import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { runAgent } from "@/lib/agent-engine";
import { logTokenUsage, isOverQuota } from "@/lib/token-usage";
import { z } from "zod";

const schema = z.object({
  atendenteId: z.string().nullable(), // null = todas as conversas (com ou sem dono)
  inicio: z.string().datetime(),
  fim: z.string().datetime(),
  // "atendimento" (default) = qualidade das conversas, como sempre foi. "comercial" = saúde
  // do funil/pipeline (gargalos, negociações travadas, conversão, ciclo de venda) — dado
  // quantitativo do Opportunity, não depende de ler transcrição de conversa.
  tipo: z.enum(["atendimento", "comercial"]).default("atendimento"),
  // Pedido livre do gestor pra guiar a análise (ex: "veja se pedem o fechamento", "confira se
  // seguem o script") — soma às notas/seções fixas, não substitui.
  foco: z.string().trim().max(500).optional(),
});

// Quando o gestor descreve o que quer ver, isso vira uma seção extra e obrigatória no
// relatório — sem essa instrução explícita, o modelo tende a diluir o pedido genericamente
// pelas seções fixas em vez de responder diretamente a ele.
function focoInstruction(foco: string | undefined, numeroSecao: number): string {
  if (!foco?.trim()) return "";
  return `\n\nADICIONAL — O GESTOR PEDIU FOCO ESPECÍFICO NESTA ANÁLISE: "${foco.trim()}"\nDedique uma seção extra numerada (${numeroSecao}. FOCO SOLICITADO) respondendo diretamente a esse pedido, com exemplos concretos dos dados/conversas quando possível. As seções acima continuam obrigatórias.`;
}

const AUDITOR_PROMPT = `Você é um auditor sênior de qualidade de atendimento e vendas por WhatsApp.
Receberá estatísticas e trechos reais de conversas de um período. Produza um relatório de auditoria em português com:

1. RESUMO EXECUTIVO (2-3 frases sobre a qualidade geral)
2. NOTAS de 0 a 10: Cordialidade e tom | Agilidade aparente | Condução comercial (avanço para venda) | Clareza das respostas
3. PONTOS FORTES (bullets curtos, com exemplos citando o cliente quando possível)
4. PONTOS DE MELHORIA (bullets curtos e específicos)
5. SUGESTÕES PRÁTICAS (o que fazer diferente já na próxima conversa)
6. CONVERSAS QUE MERECEM ATENÇÃO do gestor (cite o nome/número do cliente e o porquê em uma frase — ex: cliente esfriou sem follow-up, reclamação sem resposta, oportunidade de venda perdida)

Seja direto, específico e justo — elogie o que foi bem feito e aponte o que custou vendas. Máximo ~400 palavras.`;

const COMERCIAL_PROMPT = `Você é um consultor sênior de processos comerciais e funil de vendas B2B.
Receberá dados quantitativos do funil de vendas (pipeline) de uma empresa: quantas negociações estão paradas em cada etapa e há quanto tempo, taxa de conversão do período, ciclo médio de fechamento e as negociações mais travadas. Produza uma análise em português com:

1. RESUMO EXECUTIVO DO FUNIL (2-3 frases sobre a saúde geral do processo comercial)
2. GARGALOS IDENTIFICADOS (em que etapa(s) o funil está entupindo, com base nos números — cite quantidade e tempo parado)
3. SAÚDE DO PROCESSO — notas de 0 a 10: Fluidez do funil (sem acúmulo parado) | Velocidade de fechamento | Taxa de conversão do período
4. NEGOCIAÇÕES QUE MERECEM ATENÇÃO AGORA (cite as mais travadas da lista, com valor e tempo parado, e por que isso é urgente)
5. RECOMENDAÇÕES PRÁTICAS pra destravar o funil (ex: revisar critério de uma etapa, ativar follow-up automático nela, redistribuir carteira)

Baseie-se SOMENTE nos números fornecidos — nunca invente uma etapa, valor ou negociação que não esteja nos dados. Se os dados forem insuficientes pra alguma seção, diga isso brevemente em vez de inventar. Seja direto e específico. Máximo ~350 palavras.`;

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
  const { atendenteId, tipo, foco } = body.data;

  if (tipo === "comercial") return auditoriaComercial(config, agentId, atendenteId, inicio, fim, foco);

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

  const result = await runAgent(AUDITOR_PROMPT + focoInstruction(foco, 7), [], contexto);
  logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "auditoria", ...result.usage });

  return NextResponse.json({ relatorio: result.reply, stats });
}

// Análise do FUNIL/pipeline, não da conversa — dado quantitativo do Opportunity. O schema só
// guarda a etapa ATUAL de cada negociação (stageId + stageEnteredAt), sem histórico de por
// quais etapas ela já passou, então "conversão etapa a etapa" real não é calculável; o que dá
// pra medir com o que existe é: onde as negociações abertas estão paradas agora, há quanto
// tempo, e o resultado (ganhas/perdidas/ciclo) do período — o suficiente pra apontar gargalo.
async function auditoriaComercial(
  config: NonNullable<Awaited<ReturnType<typeof getAgentConfigAsManager>>>,
  agentId: string,
  atendenteId: string | null,
  inicio: Date,
  fim: Date,
  foco: string | undefined,
) {
  const filtroAtendente = atendenteId ? { conversation: { assignedToId: atendenteId } } : {};

  const [pipelines, abertas, doPeriodo] = await Promise.all([
    prisma.pipeline.findMany({
      where: { agentConfigId: agentId },
      orderBy: { order: "asc" },
      include: { stages: { orderBy: { order: "asc" } } },
    }),
    // Snapshot atual — não é filtrado por período, é "onde as coisas estão paradas agora"
    prisma.opportunity.findMany({
      where: { wonAt: null, lostAt: null, stage: { pipeline: { agentConfigId: agentId } }, ...filtroAtendente },
      include: { stage: true, conversation: { select: { contactName: true, contactNumber: true } } },
    }),
    prisma.opportunity.findMany({
      where: {
        stage: { pipeline: { agentConfigId: agentId } },
        ...filtroAtendente,
        OR: [{ createdAt: { gte: inicio, lte: fim } }, { wonAt: { gte: inicio, lte: fim } }, { lostAt: { gte: inicio, lte: fim } }],
      },
      select: { createdAt: true, wonAt: true, lostAt: true, dealValue: true },
    }),
  ]);

  if (pipelines.length === 0 || (abertas.length === 0 && doPeriodo.length === 0)) {
    return NextResponse.json({ error: "Nenhum funil configurado ou nenhuma negociação registrada pra esse filtro." }, { status: 404 });
  }

  const diasParado = (op: { stageEnteredAt: Date }) => (Date.now() - op.stageEnteredAt.getTime()) / 86_400_000;

  const porEtapa = pipelines.flatMap(p => p.stages.map(s => {
    const nesta = abertas.filter(o => o.stageId === s.id);
    const dias = nesta.map(diasParado);
    return {
      pipeline: p.name,
      etapa: s.name,
      quantidade: nesta.length,
      diasParadoMedio: dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 0,
      diasParadoMax: dias.length ? Math.round(Math.max(...dias)) : 0,
    };
  })).filter(e => e.quantidade > 0);

  const ganhas = doPeriodo.filter(o => o.wonAt && o.wonAt >= inicio && o.wonAt <= fim);
  const perdidas = doPeriodo.filter(o => o.lostAt && o.lostAt >= inicio && o.lostAt <= fim);
  const entradas = doPeriodo.filter(o => o.createdAt >= inicio && o.createdAt <= fim);
  const valorGanho = ganhas.reduce((s, o) => s + o.dealValue, 0);
  const valorPerdido = perdidas.reduce((s, o) => s + o.dealValue, 0);
  const ciclosDias = ganhas.filter(o => o.wonAt).map(o => (o.wonAt!.getTime() - o.createdAt.getTime()) / 86_400_000);
  const cicloMedioDias = ciclosDias.length ? Math.round(ciclosDias.reduce((a, b) => a + b, 0) / ciclosDias.length) : null;
  const taxaConversao = ganhas.length + perdidas.length > 0 ? Math.round((ganhas.length / (ganhas.length + perdidas.length)) * 100) : null;

  const maisTravadas = abertas
    .map(o => ({ nome: o.conversation.contactName || o.conversation.contactNumber, etapa: o.stage!.name, diasParado: Math.round(diasParado(o)), valor: o.dealValue }))
    .sort((a, b) => b.diasParado - a.diasParado)
    .slice(0, 8);

  const stats = {
    porEtapa,
    entradas: entradas.length,
    ganhas: ganhas.length, valorGanho,
    perdidas: perdidas.length, valorPerdido,
    cicloMedioDias, taxaConversao,
    maisTravadas,
  };

  const contexto = `PERÍODO: ${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}
FILTRO: ${atendenteId ? "negociações de um atendente específico" : "todas as negociações"}

NEGOCIAÇÕES ABERTAS AGORA, POR ETAPA (funil/pipeline → etapa: quantidade parada | dias parado em média | dias parado no pior caso):
${porEtapa.map(e => `- ${e.pipeline} → ${e.etapa}: ${e.quantidade} parada(s) | média ${e.diasParadoMedio}d | pior caso ${e.diasParadoMax}d`).join("\n") || "nenhuma negociação aberta"}

RESULTADO DO PERÍODO: ${entradas.length} negociações novas | ${ganhas.length} ganhas (R$ ${valorGanho.toFixed(2)}) | ${perdidas.length} perdidas (R$ ${valorPerdido.toFixed(2)}) | taxa de conversão ${taxaConversao ?? "sem dado suficiente"}% | ciclo médio até ganhar: ${cicloMedioDias ?? "sem dado suficiente"} dias

NEGOCIAÇÕES MAIS TRAVADAS (abertas há mais tempo na etapa atual):
${maisTravadas.map(t => `- ${t.nome} — etapa "${t.etapa}", parada há ${t.diasParado} dias, R$ ${t.valor.toFixed(2)}`).join("\n") || "nenhuma"}`;

  const result = await runAgent(COMERCIAL_PROMPT + focoInstruction(foco, 6), [], contexto);
  logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "auditoria", ...result.usage });

  return NextResponse.json({ relatorio: result.reply, stats });
}
