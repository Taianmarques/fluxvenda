import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { runAgent } from "@/lib/agent-engine";
import { logTokenUsage, isOverQuota } from "@/lib/token-usage";
import { z } from "zod";

const schema = z.object({
  periodoLabel: z.string().max(40),
  inicio: z.string().datetime(),
  fim: z.string().datetime(),
});

const ANALISTA_PROMPT = `Você é um analista comercial sênior especializado em gestão de carteira de clientes.
Receberá um resumo da carteira de uma empresa em um período. Sua tarefa:
1. Identificar as PRINCIPAIS OPORTUNIDADES comerciais (recompra, resgate de quem reduziu, fechamento de orçamentos parados).
2. Listar os CLIENTES PRIORITÁRIOS para contato imediato, com o motivo e a abordagem sugerida em uma frase.
3. Dar um diagnóstico curto da saúde da carteira.
Seja direto e prático, em português, com bullets curtos. Sem introduções longas nem despedidas. Máximo ~250 palavras.`;

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (await isOverQuota(config.teamId)) {
    return NextResponse.json({ error: "Cota de IA do plano atingida neste mês." }, { status: 429 });
  }

  const start = new Date(body.data.inicio);
  const end = new Date(body.data.fim);
  const len = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - len);

  const [conversations, orders, cobrancas] = await Promise.all([
    prisma.conversation.findMany({
      where: { agentConfigId: config.id },
      select: {
        contactNumber: true, contactName: true, updatedAt: true, status: true,
        messages: { where: { role: { not: "note" } }, orderBy: { createdAt: "desc" }, take: 1, select: { role: true } },
      },
    }),
    prisma.order.findMany({
      where: { agentConfigId: config.id, status: { in: ["PAGO", "ABERTO", "AGUARDANDO_PAGAMENTO"] } },
      select: { contactNumber: true, status: true, total: true, deliveryFee: true, paidAt: true },
    }),
    prisma.cobranca.findMany({
      where: { agentConfigId: config.id, status: "PAGO" },
      select: { contactNumber: true, valor: true, paidAt: true },
    }),
  ]);

  type Cli = {
    nome: string; numero: string; periodo: number; anterior: number; total: number;
    orcamentoAberto: number; ultimaCompra: Date | null; ultimoContato: Date; aguardandoResposta: boolean;
  };
  const map = new Map<string, Cli>();
  for (const c of conversations) {
    if (!map.has(c.contactNumber)) {
      map.set(c.contactNumber, {
        nome: c.contactName || c.contactNumber, numero: c.contactNumber,
        periodo: 0, anterior: 0, total: 0, orcamentoAberto: 0, ultimaCompra: null,
        ultimoContato: c.updatedAt,
        aguardandoResposta: c.status !== "FINALIZADO" && (c.messages[0]?.role === "assistant" || c.messages[0]?.role === "human"),
      });
    }
  }
  const addCompra = (numero: string, valor: number, at: Date | null) => {
    const cli = map.get(numero);
    if (!cli || !at) return;
    cli.total += valor;
    if (at >= start && at <= end) cli.periodo += valor;
    else if (at >= prevStart && at < start) cli.anterior += valor;
    if (!cli.ultimaCompra || at > cli.ultimaCompra) cli.ultimaCompra = at;
  };
  for (const o of orders) {
    if (o.status === "PAGO") addCompra(o.contactNumber, o.total + o.deliveryFee, o.paidAt);
    else { const cli = map.get(o.contactNumber); if (cli) cli.orcamentoAberto += o.total + o.deliveryFee; }
  }
  for (const cb of cobrancas) addCompra(cb.contactNumber, cb.valor, cb.paidAt);

  const clientes = Array.from(map.values());
  const brl = (v: number) => `R$ ${v.toFixed(2)}`;
  const dias = (d: Date | null) => d ? Math.floor((Date.now() - d.getTime()) / 86400000) : null;

  const resumo = {
    totalClientes: clientes.length,
    compraramNoPeriodo: clientes.filter(c => c.periodo > 0).length,
    naoCompraram: clientes.filter(c => c.periodo === 0).length,
    reduziram: clientes.filter(c => c.anterior > 0 && c.periodo < c.anterior).length,
    aumentaram: clientes.filter(c => c.periodo > c.anterior && c.periodo > 0).length,
    comOrcamentoAberto: clientes.filter(c => c.orcamentoAberto > 0).length,
    aguardandoResposta: clientes.filter(c => c.aguardandoResposta).length,
    receitaPeriodo: clientes.reduce((s, c) => s + c.periodo, 0),
    receitaPeriodoAnterior: clientes.reduce((s, c) => s + c.anterior, 0),
  };

  const destaque = (lista: Cli[], formato: (c: Cli) => string, n = 8) => lista.slice(0, n).map(formato).join("\n") || "(nenhum)";

  const detalhes = `PERÍODO: ${body.data.periodoLabel}
RESUMO: ${resumo.totalClientes} clientes | compraram: ${resumo.compraramNoPeriodo} | não compraram: ${resumo.naoCompraram} | reduziram: ${resumo.reduziram} | aumentaram: ${resumo.aumentaram} | orçamento aberto: ${resumo.comOrcamentoAberto} | aguardando resposta: ${resumo.aguardandoResposta}
RECEITA: período ${brl(resumo.receitaPeriodo)} vs anterior ${brl(resumo.receitaPeriodoAnterior)}

REDUZIRAM COMPRA (maiores quedas):
${destaque(clientes.filter(c => c.anterior > 0 && c.periodo < c.anterior).sort((a, b) => (b.anterior - b.periodo) - (a.anterior - a.periodo)), c => `- ${c.nome}: ${brl(c.anterior)} → ${brl(c.periodo)}`)}

ORÇAMENTOS EM ABERTO (maiores valores):
${destaque(clientes.filter(c => c.orcamentoAberto > 0).sort((a, b) => b.orcamentoAberto - a.orcamentoAberto), c => `- ${c.nome}: ${brl(c.orcamentoAberto)} parado`)}

MELHORES CLIENTES SEM COMPRA NO PERÍODO (maior histórico):
${destaque(clientes.filter(c => c.periodo === 0 && c.total > 0).sort((a, b) => b.total - a.total), c => `- ${c.nome}: total histórico ${brl(c.total)}, última compra há ${dias(c.ultimaCompra) ?? "?"} dias`)}

AGUARDANDO RESPOSTA (follow-up pendente):
${destaque(clientes.filter(c => c.aguardandoResposta).sort((a, b) => b.total - a.total), c => `- ${c.nome}: sem resposta há ${dias(c.ultimoContato) ?? "?"} dias`)}`;

  const result = await runAgent(ANALISTA_PROMPT, [], detalhes);
  logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "carteira_analise", ...result.usage });

  return NextResponse.json({ analise: result.reply });
}
