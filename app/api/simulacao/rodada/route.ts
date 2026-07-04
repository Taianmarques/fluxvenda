import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { logTokenUsage, getTeamIdForUser } from "@/lib/token-usage";

type DecisionOption = { id: string; label: string; hint: string };
type Category = { key: string; label: string; icon: string; options: DecisionOption[] };
type ScenarioPayload = { scenario: string; challenge: string; categories: Category[] };

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, teamId] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: userId },
        select: { role: true, segment: true, name: true },
      }),
      getTeamIdForUser(userId),
    ]);

    const isVendedor = profile?.role === "VENDEDOR";

    let company = await prisma.virtualCompany.findUnique({
      where: { profileId: userId },
      include: { rounds: { orderBy: { month: "asc" }, take: 5 } },
    });

    // Auto-setup para vendedores: cria sessão automaticamente com dados do perfil
    if (!company && isVendedor) {
      const segment = profile?.segment ?? "SaaS";
      company = await prisma.virtualCompany.create({
        data: {
          profileId: userId,
          name: `Prática de Vendas`,
          segment,
          currentMRR: 500, // score inicial: 500 pts
          currentMonth: 1,
        },
        include: { rounds: { orderBy: { month: "asc" }, take: 5 } },
      });
    }

    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const history = company.rounds.map((r) => ({
      month: r.month,
      mrrBefore: r.mrrBefore,
      mrrAfter: r.mrrAfter,
    }));

    const scenario = isVendedor
      ? await generateVendedorScenario({
          segment: company.segment,
          round: company.currentMonth,
          history,
        })
      : await generateGestorScenario({
          name: company.name,
          segment: company.segment,
          currentMRR: company.currentMRR,
          currentMonth: company.currentMonth,
          history,
        });

    if (teamId && (scenario as any)._usage) logTokenUsage({ teamId, provider: "openai", model: "gpt-4o-mini", feature: "simulacao", inputTokens: (scenario as any)._usage.input, outputTokens: (scenario as any)._usage.output });

    return NextResponse.json({
      company: {
        name: company.name,
        segment: company.segment,
        currentMRR: company.currentMRR,
        currentMonth: company.currentMonth,
      },
      mode: isVendedor ? "VENDEDOR" : "GESTOR",
      scenario,
    });
  } catch (err) {
    console.error("[simulacao/rodada GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, teamId] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
      getTeamIdForUser(userId),
    ]);

    const isVendedor = profile?.role === "VENDEDOR";

    const body = await req.json();
    const { decisions, scenario } = body as {
      decisions: Record<string, string>;
      scenario: ScenarioPayload;
    };

    const company = await prisma.virtualCompany.findUnique({
      where: { profileId: userId },
      include: { rounds: { orderBy: { month: "asc" } } },
    });

    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const result = isVendedor
      ? await evaluateVendedorDecisions({ segment: company.segment, currentMonth: company.currentMonth, scenario, decisions })
      : await evaluateGestorDecisions({ name: company.name, segment: company.segment, currentMRR: company.currentMRR, currentMonth: company.currentMonth, scenario, decisions });

    if (teamId && (result as any)._usage) logTokenUsage({ teamId, provider: "openai", model: "gpt-4o-mini", feature: "simulacao", inputTokens: (result as any)._usage.input, outputTokens: (result as any)._usage.output });

    const newMRR = Math.max(0, company.currentMRR * (1 + result.mrrChangePercent / 100));
    const xpGained = Math.max(50, Math.round(100 + result.mrrChangePercent * 3));

    const round = await prisma.simulationRound.create({
      data: {
        companyId: company.id,
        month: company.currentMonth,
        mrrBefore: company.currentMRR,
        mrrAfter: newMRR,
        aiAnalysis: JSON.stringify({ scenario, result }),
        decisions: {
          create: scenario.categories.map((cat) => ({
            category: cat.label,
            decision: decisions[cat.key] ?? "",
            impact: result.categoryImpacts?.[cat.key] ?? 0,
            xpGained: Math.round(xpGained / 4),
          })),
        },
      },
    });

    await prisma.virtualCompany.update({
      where: { id: company.id },
      data: { currentMRR: newMRR, currentMonth: company.currentMonth + 1 },
    });

    await prisma.profile.update({
      where: { id: userId },
      data: { xp: { increment: xpGained } },
    });

    return NextResponse.json({
      roundId: round.id,
      mrrBefore: company.currentMRR,
      mrrAfter: newMRR,
      mrrChangePercent: result.mrrChangePercent,
      xpGained,
      summary: result.summary,
      feedback: result.feedback,
      categoryImpacts: result.categoryImpacts,
      mode: isVendedor ? "VENDEDOR" : "GESTOR",
    });
  } catch (err) {
    console.error("[simulacao/rodada POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ─── Cenários para VENDEDOR (role-play de situação de venda) ─────────────────

const VENDEDOR_SITUATIONS = [
  "cold call", "reunião de discovery", "apresentação da proposta", "negociação de contrato",
  "follow-up após proposta", "contorno de objeções", "reunião com decisor", "demo do produto",
];

async function generateVendedorScenario(data: {
  segment: string;
  round: number;
  history: { month: number; mrrBefore: number; mrrAfter: number }[];
}): Promise<ScenarioPayload> {
  const { segment, round, history } = data;
  const situation = VENDEDOR_SITUATIONS[(round - 1) % VENDEDOR_SITUATIONS.length];
  const previousPerf = history.length
    ? `Rodadas anteriores: ${history.map(h => `Rodada ${h.month}: ${h.mrrAfter >= h.mrrBefore ? "+" : ""}${Math.round((h.mrrAfter - h.mrrBefore) / h.mrrBefore * 100)}%`).join(", ")}`
    : "Primeira rodada";

  const prompt = `Você é um simulador de situações reais de vendas B2B. Crie um cenário de role-play para um vendedor no segmento ${segment}.

Situação desta rodada: ${situation} (Rodada ${round})
${previousPerf}

Retorne APENAS este JSON:
{
  "scenario": "Descreva a situação de venda em 2-3 frases vívidas e realistas. Mencione o perfil do prospect, a empresa dele, e o contexto da conversa. Use primeira pessoa para o vendedor (ex: 'Você está...')",
  "challenge": "O principal desafio desta situação de venda em 1 frase direta (ex: 'O prospect mencionou que está avaliando 3 concorrentes e quer saber o preço logo')",
  "categories": [
    {
      "key": "abordagem",
      "label": "Abordagem",
      "icon": "📞",
      "options": [
        { "id": "a", "label": "Opção A de abordagem (até 7 palavras)", "hint": "consequência desta escolha" },
        { "id": "b", "label": "Opção B de abordagem (até 7 palavras)", "hint": "consequência desta escolha" },
        { "id": "c", "label": "Opção C de abordagem (até 7 palavras)", "hint": "consequência desta escolha" }
      ]
    },
    {
      "key": "qualificacao",
      "label": "Qualificação",
      "icon": "🔍",
      "options": [
        { "id": "a", "label": "Opção A de qualificação (até 7 palavras)", "hint": "consequência" },
        { "id": "b", "label": "Opção B de qualificação (até 7 palavras)", "hint": "consequência" },
        { "id": "c", "label": "Opção C de qualificação (até 7 palavras)", "hint": "consequência" }
      ]
    },
    {
      "key": "proposta",
      "label": "Proposta de Valor",
      "icon": "💎",
      "options": [
        { "id": "a", "label": "Opção A de pitch (até 7 palavras)", "hint": "consequência" },
        { "id": "b", "label": "Opção B de pitch (até 7 palavras)", "hint": "consequência" },
        { "id": "c", "label": "Opção C de pitch (até 7 palavras)", "hint": "consequência" }
      ]
    },
    {
      "key": "fechamento",
      "label": "Fechamento",
      "icon": "🤝",
      "options": [
        { "id": "a", "label": "Opção A de fechamento (até 7 palavras)", "hint": "consequência" },
        { "id": "b", "label": "Opção B de fechamento (até 7 palavras)", "hint": "consequência" },
        { "id": "c", "label": "Opção C de fechamento (até 7 palavras)", "hint": "consequência" }
      ]
    }
  ]
}

Regras: as opções devem refletir diferentes níveis de habilidade (uma fraca/errada, uma mediana, uma excelente). Seja específico para ${segment}. Cenários devem ser progressivamente mais desafiadores nas rodadas avançadas.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });
    return { ...JSON.parse(completion.choices[0]?.message?.content ?? "{}"), _usage: { input: completion.usage?.prompt_tokens ?? 0, output: completion.usage?.completion_tokens ?? 0 } };
  } catch {
    return fallbackVendedorScenario(round, segment);
  }
}

async function evaluateVendedorDecisions(data: {
  segment: string;
  currentMonth: number;
  scenario: ScenarioPayload;
  decisions: Record<string, string>;
}) {
  const { segment, currentMonth, scenario, decisions } = data;

  const decisionLines = scenario.categories.map((cat) => {
    const chosen = cat.options.find((o) => o.id === decisions[cat.key]);
    return `${cat.label}: "${chosen?.label ?? "Não escolhido"}" (${chosen?.hint ?? ""})`;
  }).join("\n");

  const prompt = `Você é um coach de vendas B2B avaliando as decisões de um vendedor em uma situação real de venda.

Segmento: ${segment} | Rodada: ${currentMonth}
Situação: ${scenario.scenario}
Desafio: ${scenario.challenge}

Decisões do vendedor:
${decisionLines}

Retorne APENAS este JSON:
{
  "mrrChangePercent": número entre -30 e +40 representando o desempenho desta rodada (decisões excelentes = +30 a +40, medianas = +5 a +15, ruins = -20 a -30),
  "summary": "Narrativa do que aconteceu na situação de venda em 3-4 frases. Descreva o resultado da abordagem, como o prospect reagiu, e o que foi conquistado ou perdido. Use segunda pessoa ('Você...').",
  "feedback": {
    "abordagem": "avaliação da abordagem do vendedor em 1-2 frases com dica prática",
    "qualificacao": "avaliação da qualificação em 1-2 frases com dica prática",
    "proposta": "avaliação do pitch/proposta em 1-2 frases com dica prática",
    "fechamento": "avaliação do fechamento em 1-2 frases com dica prática"
  },
  "categoryImpacts": {
    "abordagem": número percentual de impacto isolado desta decisão,
    "qualificacao": número percentual de impacto isolado,
    "proposta": número percentual de impacto isolado,
    "fechamento": número percentual de impacto isolado
  }
}

Seja didático: explique o que foi certo ou errado em cada decisão. Impacto realista: decisões ruins custam caro, boas têm recompensa. Seja específico para vendas em ${segment}.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });
    return { ...JSON.parse(completion.choices[0]?.message?.content ?? "{}"), _usage: { input: completion.usage?.prompt_tokens ?? 0, output: completion.usage?.completion_tokens ?? 0 } };
  } catch {
    return {
      mrrChangePercent: 5,
      summary: "Situação encerrada. Suas decisões tiveram impacto moderado.",
      feedback: { abordagem: "OK", qualificacao: "OK", proposta: "OK", fechamento: "OK" },
      categoryImpacts: { abordagem: 1, qualificacao: 1, proposta: 1, fechamento: 2 },
    };
  }
}

// ─── Cenários para GESTOR (gerenciamento de empresa) ─────────────────────────

async function generateGestorScenario(data: {
  name: string;
  segment: string;
  currentMRR: number;
  currentMonth: number;
  history: { month: number; mrrBefore: number; mrrAfter: number }[];
}): Promise<ScenarioPayload> {
  const { name, segment, currentMRR, currentMonth, history } = data;

  const historyText = history.length
    ? history.map((h) => `Mês ${h.month}: MRR ${fmtMRR(h.mrrBefore)} → ${fmtMRR(h.mrrAfter)}`).join(", ")
    : "Empresa iniciando";

  const prompt = `Você é um simulador de negócios B2B. Crie um cenário realista para o Mês ${currentMonth} da empresa "${name}" no segmento ${segment}.

Contexto:
- MRR atual: ${fmtMRR(currentMRR)}
- Histórico: ${historyText}

Retorne APENAS este JSON:
{
  "scenario": "Descrição da situação de mercado neste mês (2-3 frases vívidas e realistas para ${segment})",
  "challenge": "Principal desafio comercial deste mês (1 frase direta)",
  "categories": [
    {
      "key": "prospeccao",
      "label": "Prospecção",
      "icon": "🎯",
      "options": [
        { "id": "a", "label": "Opção A (até 6 palavras)", "hint": "consequência esperada" },
        { "id": "b", "label": "Opção B (até 6 palavras)", "hint": "consequência esperada" },
        { "id": "c", "label": "Opção C (até 6 palavras)", "hint": "consequência esperada" }
      ]
    },
    {
      "key": "processo",
      "label": "Processo de Vendas",
      "icon": "⚙️",
      "options": [
        { "id": "a", "label": "Opção A", "hint": "consequência" },
        { "id": "b", "label": "Opção B", "hint": "consequência" },
        { "id": "c", "label": "Opção C", "hint": "consequência" }
      ]
    },
    {
      "key": "equipe",
      "label": "Equipe",
      "icon": "👥",
      "options": [
        { "id": "a", "label": "Opção A", "hint": "consequência" },
        { "id": "b", "label": "Opção B", "hint": "consequência" },
        { "id": "c", "label": "Opção C", "hint": "consequência" }
      ]
    },
    {
      "key": "estrategia",
      "label": "Estratégia",
      "icon": "♟️",
      "options": [
        { "id": "a", "label": "Opção A", "hint": "consequência" },
        { "id": "b", "label": "Opção B", "hint": "consequência" },
        { "id": "c", "label": "Opção C", "hint": "consequência" }
      ]
    }
  ]
}

Regras: opções devem ser específicas para ${segment}, variadas em risco/retorno, máx 6 palavras por label.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });
    return { ...JSON.parse(completion.choices[0]?.message?.content ?? "{}"), _usage: { input: completion.usage?.prompt_tokens ?? 0, output: completion.usage?.completion_tokens ?? 0 } };
  } catch {
    return fallbackGestorScenario(currentMonth, segment);
  }
}

async function evaluateGestorDecisions(data: {
  name: string;
  segment: string;
  currentMRR: number;
  currentMonth: number;
  scenario: ScenarioPayload;
  decisions: Record<string, string>;
}) {
  const { name, segment, currentMRR, currentMonth, scenario, decisions } = data;

  const decisionLines = scenario.categories.map((cat) => {
    const chosen = cat.options.find((o) => o.id === decisions[cat.key]);
    return `${cat.label}: "${chosen?.label ?? "Não escolhido"}" (${chosen?.hint ?? ""})`;
  }).join("\n");

  const prompt = `Avalie as decisões comerciais desta empresa B2B e calcule o impacto no MRR.

Empresa: ${name} | Segmento: ${segment} | Mês: ${currentMonth}
MRR atual: ${fmtMRR(currentMRR)}
Cenário: ${scenario.scenario}
Desafio: ${scenario.challenge}

Decisões tomadas:
${decisionLines}

Retorne APENAS este JSON:
{
  "mrrChangePercent": número entre -25 e +35 (realista, baseado na qualidade das decisões),
  "summary": "Narrativa do que aconteceu neste mês (3-4 frases envolventes, mencione as consequências reais)",
  "feedback": {
    "prospeccao": "avaliação da decisão de prospecção (1-2 frases)",
    "processo": "avaliação da decisão de processo (1-2 frases)",
    "equipe": "avaliação da decisão de equipe (1-2 frases)",
    "estrategia": "avaliação da decisão estratégica (1-2 frases)"
  },
  "categoryImpacts": {
    "prospeccao": número percentual de impacto isolado,
    "processo": número percentual de impacto isolado,
    "equipe": número percentual de impacto isolado,
    "estrategia": número percentual de impacto isolado
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });
    return { ...JSON.parse(completion.choices[0]?.message?.content ?? "{}"), _usage: { input: completion.usage?.prompt_tokens ?? 0, output: completion.usage?.completion_tokens ?? 0 } };
  } catch {
    return {
      mrrChangePercent: 5,
      summary: "Mês encerrado. As decisões tiveram impacto moderado.",
      feedback: { prospeccao: "OK", processo: "OK", equipe: "OK", estrategia: "OK" },
      categoryImpacts: { prospeccao: 1, processo: 1, equipe: 1, estrategia: 2 },
    };
  }
}

function fmtMRR(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fallbackVendedorScenario(round: number, segment: string): ScenarioPayload {
  return {
    scenario: `Você está em uma reunião de discovery com o gerente comercial de uma empresa de ${segment}. Ele demonstra interesse mas está avaliando outras soluções.`,
    challenge: "O prospect pediu o preço logo no início antes de entender o valor da solução.",
    categories: [
      { key: "abordagem", label: "Abordagem", icon: "📞", options: [
        { id: "a", label: "Dar o preço imediatamente", hint: "Perde posicionamento de valor" },
        { id: "b", label: "Redirecionar para o problema", hint: "Mantém controle da conversa" },
        { id: "c", label: "Fazer pergunta de descoberta", hint: "Aumenta contexto e engajamento" },
      ]},
      { key: "qualificacao", label: "Qualificação", icon: "🔍", options: [
        { id: "a", label: "Perguntar sobre orçamento disponível", hint: "Qualificação direta, pode inibir" },
        { id: "b", label: "Entender a dor atual em detalhe", hint: "Cria empatia e urgência" },
        { id: "c", label: "Descobrir quem toma a decisão", hint: "Mapeia o processo de compra" },
      ]},
      { key: "proposta", label: "Proposta de Valor", icon: "💎", options: [
        { id: "a", label: "Apresentar todas as funcionalidades", hint: "Pode sobrecarregar o prospect" },
        { id: "b", label: "Focar na dor específica dele", hint: "Altamente relevante e persuasivo" },
        { id: "c", label: "Mostrar um case do segmento", hint: "Prova social gera confiança" },
      ]},
      { key: "fechamento", label: "Fechamento", icon: "🤝", options: [
        { id: "a", label: "Propor reunião de follow-up vaga", hint: "Baixa conversão, sem urgência" },
        { id: "b", label: "Definir próximos passos concretos", hint: "Mantém momentum do negócio" },
        { id: "c", label: "Propor uma prova de conceito", hint: "Reduz risco percebido do prospect" },
      ]},
    ],
  };
}

function fallbackGestorScenario(month: number, segment: string): ScenarioPayload {
  return {
    scenario: `Mês ${month} começa com o mercado de ${segment} em movimento. Novos concorrentes surgem e clientes estão mais exigentes.`,
    challenge: "Manter crescimento consistente enquanto controla custos.",
    categories: [
      { key: "prospeccao", label: "Prospecção", icon: "🎯", options: [
        { id: "a", label: "Prospecção ativa no LinkedIn", hint: "Volume alto, conversão média" },
        { id: "b", label: "Programa de indicações", hint: "Baixo custo, ciclo longo" },
        { id: "c", label: "Eventos e networking", hint: "Alta qualidade, baixo volume" },
      ]},
      { key: "processo", label: "Processo de Vendas", icon: "⚙️", options: [
        { id: "a", label: "Implementar CRM básico", hint: "Organização imediata" },
        { id: "b", label: "Treinar equipe em discovery", hint: "Melhora qualificação" },
        { id: "c", label: "Criar proposta padrão", hint: "Ciclo mais rápido" },
      ]},
      { key: "equipe", label: "Equipe", icon: "👥", options: [
        { id: "a", label: "Contratar SDR", hint: "Investimento + 45 dias para produzir" },
        { id: "b", label: "Bonificar top performer", hint: "Motivação imediata" },
        { id: "c", label: "Treinamento intensivo", hint: "Melhora consistência" },
      ]},
      { key: "estrategia", label: "Estratégia", icon: "♟️", options: [
        { id: "a", label: "Focar no nicho atual", hint: "Menor risco, crescimento estável" },
        { id: "b", label: "Expandir para novo segmento", hint: "Alto potencial, alta incerteza" },
        { id: "c", label: "Upsell na base atual", hint: "ROI rápido, sem novo CAC" },
      ]},
    ],
  };
}
