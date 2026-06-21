import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openai, MODEL } from "@/lib/openai";
import { z } from "zod";
import { generateMissionsFromDiagnostic } from "@/lib/missoes";
import { levelFromXP } from "@/lib/utils";

const schema = z.object({
  companyName:    z.string().min(1),
  businessModel:  z.enum(["B2B", "B2C"]).optional(),
  segment:        z.string().min(1),
  subsegment:     z.string().optional(),
  teamSize:       z.string().min(1),
  answers:        z.record(z.number()),
  diagnosticType: z.enum(["EMPRESA", "VENDEDOR"]).default("EMPRESA"),
});

const CAT_KEYS = ["leads", "process", "team", "kpis", "tools", "value", "retention", "money"] as const;

// Labels das áreas por tipo de diagnóstico
const AREA_LABELS_EMPRESA: Record<string, string> = {
  leads: "Geração de Leads", process: "Processo de Vendas", team: "Equipe",
  kpis: "KPIs & Dados", tools: "Ferramentas", value: "Proposta de Valor",
  retention: "Retenção", money: "Dinheiro na Mesa",
};
const AREA_LABELS_VENDEDOR: Record<string, string> = {
  leads: "Prospecção Ativa", process: "Qualificação", team: "Negociação & Objeções",
  kpis: "Fechamento & Follow-up", tools: "Ferramentas & Organização", value: "Pitch & Proposta", retention: "Desenvolvimento Contínuo",
};

function calcScore(answers: Record<string, number>, prefix: string): number {
  const vals = [1, 2, 3, 4, 5].map((i) => answers[`${prefix}_${i}`] ?? 20);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function getPriority(total: number) {
  if (total < 40) return "CRITICO";
  if (total < 60) return "ATENCAO";
  if (total < 80) return "BOM";
  return "EXCELENTE";
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const { companyName, businessModel, segment, subsegment, teamSize, answers, diagnosticType } = body.data;

    const scoreLeads     = calcScore(answers, "leads");
    const scoreProcess   = calcScore(answers, "process");
    const scoreTeam      = calcScore(answers, "team");
    const scoreKpis      = calcScore(answers, "kpis");
    const scoreTools     = calcScore(answers, "tools");
    const scoreValue     = calcScore(answers, "value");
    const scoreRetention = calcScore(answers, "retention");
    const scoreMoney     = diagnosticType === "EMPRESA" ? calcScore(answers, "money") : 0;
    const baseScores     = [scoreLeads, scoreProcess, scoreTeam, scoreKpis, scoreTools, scoreValue, scoreRetention];
    const scoreTotal = Math.round(
      (diagnosticType === "EMPRESA"
        ? [...baseScores, scoreMoney]
        : baseScores
      ).reduce((a, b) => a + b, 0) / (diagnosticType === "EMPRESA" ? 8 : 7)
    );

    const diagnostic = await prisma.diagnostic.create({
      data: {
        profileId: userId,
        companyName,
        segment,
        teamSize,
        answers: JSON.stringify(answers),
        diagnosticType,
        scoreLeads,
        scoreProcess,
        scoreTeam,
        scoreKpis,
        scoreTools,
        scoreValue,
        scoreRetention,
        scoreMoney,
        scoreTotal,
      },
    });

    const scores = { scoreLeads, scoreProcess, scoreTeam, scoreKpis, scoreTools, scoreValue, scoreRetention, scoreMoney, scoreTotal };
    const areaLabels = diagnosticType === "VENDEDOR" ? AREA_LABELS_VENDEDOR : AREA_LABELS_EMPRESA;
    const aiResult = await generateAnalysis({ companyName, businessModel: businessModel ?? "B2B", segment, subsegment: subsegment ?? "", teamSize, scores, diagnosticType, areaLabels });

    await prisma.diagnosticResult.create({
      data: {
        diagnosticId: diagnostic.id,
        summary:      aiResult.summary,
        strengths:    JSON.stringify(aiResult.strengths ?? []),
        weaknesses:   JSON.stringify(aiResult.weaknesses ?? []),
        actions:      JSON.stringify(aiResult.actions ?? []),
        priority:     getPriority(scoreTotal),
        classification: JSON.stringify(aiResult.classification ?? {}),
        insights:       JSON.stringify(aiResult.insights ?? {}),
      },
    });

    // XP por completar scanner
    const [, profile] = await prisma.$transaction([
      prisma.xPTransaction.create({
        data: { profileId: userId, amount: 100, reason: "Scanner de vendas concluído", source: "SCANNER_COMPLETE" },
      }),
      prisma.profile.update({ where: { id: userId }, data: { xp: { increment: 100 } } }),
    ]);
    const newLevel = levelFromXP(profile.xp);
    if (newLevel > profile.level) {
      await prisma.profile.update({ where: { id: userId }, data: { level: newLevel } });
    }

    return NextResponse.json({ id: diagnostic.id });
  } catch (err) {
    console.error("[scanner]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

async function generateAnalysis(data: {
  companyName: string;
  businessModel: string;
  segment: string;
  subsegment: string;
  teamSize: string;
  scores: Record<string, number>;
  diagnosticType: "EMPRESA" | "VENDEDOR";
  areaLabels: Record<string, string>;
}) {
  const { companyName, businessModel, segment, subsegment, teamSize, scores, diagnosticType, areaLabels } = data;
  const companyProfile = subsegment ? `${businessModel} • ${segment} / ${subsegment}` : `${businessModel} • ${segment}`;

  const isVendedor = diagnosticType === "VENDEDOR";

  const scoreBlock = [
    `- ${areaLabels.leads}: ${scores.scoreLeads}`,
    `- ${areaLabels.process}: ${scores.scoreProcess}`,
    `- ${areaLabels.team}: ${scores.scoreTeam}`,
    `- ${areaLabels.kpis}: ${scores.scoreKpis}`,
    `- ${areaLabels.tools}: ${scores.scoreTools}`,
    `- ${areaLabels.value}: ${scores.scoreValue}`,
    `- ${areaLabels.retention}: ${scores.scoreRetention}`,
    ...(diagnosticType === "EMPRESA" ? [`- ${areaLabels.money}: ${scores.scoreMoney}`] : []),
    `- SCORE TOTAL: ${scores.scoreTotal}`,
  ].join("\n");

  const prompt = isVendedor
    ? `Você é um coach sênior de vendas B2B com 20 anos de experiência formando os melhores vendedores do mercado. Analise o auto-diagnóstico individual abaixo e retorne um JSON completo.

VENDEDOR(A) — SEGMENTO: ${segment}

SCORES POR ÁREA — MATURIDADE INDIVIDUAL (0-100):
${scoreBlock}

A escala foi: 20=Nunca, 40=Raramente, 60=Às vezes, 80=Frequente, 100=Sempre.

Retorne APENAS este JSON sem markdown:
{
  "summary": "resumo direto em 2-3 frases sobre o nível atual deste vendedor e seu maior gap",
  "classification": {
    "leads": "CRITICO|ATENCAO|FORTE",
    "process": "CRITICO|ATENCAO|FORTE",
    "value": "CRITICO|ATENCAO|FORTE",
    "team": "CRITICO|ATENCAO|FORTE",
    "kpis": "CRITICO|ATENCAO|FORTE",
    "tools": "CRITICO|ATENCAO|FORTE",
    "retention": "CRITICO|ATENCAO|FORTE"
  },
  "insights": {
    "leads": "análise da prospecção ativa deste vendedor em 1-2 frases práticas",
    "process": "análise da qualificação em 1-2 frases práticas",
    "value": "análise do pitch e proposta em 1-2 frases práticas",
    "team": "análise da negociação e objeções em 1-2 frases práticas",
    "kpis": "análise do fechamento e follow-up em 1-2 frases práticas",
    "tools": "análise do uso de ferramentas em 1-2 frases práticas",
    "retention": "análise do desenvolvimento contínuo em 1-2 frases práticas"
  },
  "strengths": ["competência forte 1 específica deste vendedor", "competência forte 2", "competência forte 3"],
  "weaknesses": ["principal gap 1 que está custando vendas", "principal gap 2", "principal gap 3"],
  "actions": [
    { "title": "ação de desenvolvimento concreta 1", "area": "${areaLabels.leads}", "priority": "ALTA", "description": "o que praticar, como e com qual frequência", "timeframe": "30 dias" },
    { "title": "ação de desenvolvimento concreta 2", "area": "${areaLabels.process}", "priority": "ALTA", "description": "o que praticar, como e com qual frequência", "timeframe": "30 dias" },
    { "title": "ação de desenvolvimento concreta 3", "area": "área com menor score", "priority": "ALTA", "description": "o que praticar, como e com qual frequência", "timeframe": "60 dias" },
    { "title": "ação de desenvolvimento concreta 4", "area": "outra área crítica", "priority": "MEDIA", "description": "o que praticar, como e com qual frequência", "timeframe": "60 dias" },
    { "title": "ação de desenvolvimento concreta 5", "area": "área de oportunidade", "priority": "MEDIA", "description": "o que praticar, como e com qual frequência", "timeframe": "90 dias" },
    { "title": "ação de desenvolvimento concreta 6", "area": "área de melhoria", "priority": "BAIXA", "description": "o que praticar, como e com qual frequência", "timeframe": "90 dias" }
  ]
}

Classificação: CRITICO = score < 40, ATENCAO = score 40-69, FORTE = score >= 70. Seja específico para vendas no segmento ${segment}. Use linguagem direta, como um coach falando com o vendedor.`

    : `Você é um especialista sênior em vendas com 20 anos de experiência. Analise o diagnóstico comercial abaixo e retorne um JSON completo.

EMPRESA: ${companyName}
PERFIL: ${companyProfile}
EQUIPE DE VENDAS: ${teamSize} pessoas

SCORES POR ÁREA (0-100):
${scoreBlock}

Retorne APENAS este JSON sem markdown:
{
  "summary": "resumo executivo em 2-3 frases diretas sobre a situação comercial atual",
  "classification": {
    "leads": "CRITICO|ATENCAO|FORTE",
    "process": "CRITICO|ATENCAO|FORTE",
    "team": "CRITICO|ATENCAO|FORTE",
    "kpis": "CRITICO|ATENCAO|FORTE",
    "tools": "CRITICO|ATENCAO|FORTE",
    "value": "CRITICO|ATENCAO|FORTE",
    "retention": "CRITICO|ATENCAO|FORTE",
    "money": "CRITICO|ATENCAO|FORTE"
  },
  "insights": {
    "leads": "análise específica e prática em 1-2 frases",
    "process": "análise específica e prática em 1-2 frases",
    "team": "análise específica e prática em 1-2 frases",
    "kpis": "análise específica e prática em 1-2 frases",
    "tools": "análise específica e prática em 1-2 frases",
    "value": "análise específica e prática em 1-2 frases",
    "retention": "análise específica e prática em 1-2 frases",
    "money": "análise em 1-2 frases sobre onde a empresa está deixando receita na mesa: upsell, base inativa, descontos excessivos, referral e ticket médio"
  },
  "strengths": ["ponto forte 1 específico", "ponto forte 2 específico", "ponto forte 3 específico"],
  "weaknesses": ["principal fraqueza 1", "principal fraqueza 2", "principal fraqueza 3"],
  "actions": [
    { "title": "ação concreta 1", "area": "Geração de Leads", "priority": "ALTA", "description": "como implementar em detalhes práticos", "timeframe": "30 dias" },
    { "title": "ação concreta 2", "area": "Processo de Vendas", "priority": "ALTA", "description": "como implementar em detalhes práticos", "timeframe": "30 dias" },
    { "title": "ação concreta 3", "area": "área com menor score", "priority": "ALTA", "description": "como implementar em detalhes práticos", "timeframe": "60 dias" },
    { "title": "ação concreta 4", "area": "outra área crítica", "priority": "MEDIA", "description": "como implementar em detalhes práticos", "timeframe": "60 dias" },
    { "title": "ação concreta 5", "area": "Dinheiro na Mesa", "priority": "MEDIA", "description": "ação concreta para capturar receita perdida: reativação de clientes, upsell estruturado ou programa de referral", "timeframe": "90 dias" },
    { "title": "ação concreta 6", "area": "área de melhoria", "priority": "BAIXA", "description": "como implementar em detalhes práticos", "timeframe": "90 dias" }
  ]
}

Classificação: CRITICO = score < 40, ATENCAO = score 40-69, FORTE = score >= 70. Seja específico para o perfil ${companyProfile}, adaptando todas as recomendações ao contexto deste tipo de empresa.`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });
    return JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    return {
      summary: "Diagnóstico gerado com base nas suas respostas.",
      classification: Object.fromEntries(CAT_KEYS.map((k) => [k, "ATENCAO"])),
      insights: Object.fromEntries(CAT_KEYS.map((k) => [k, "Análise não disponível."])),
      strengths: ["Comprometimento com autoavaliação"],
      weaknesses: ["Áreas a identificar com mais detalhes"],
      actions: [{ title: "Revisar processos", area: "Geral", priority: "ALTA", description: "Iniciar mapeamento dos pontos de melhoria.", timeframe: "30 dias" }],
    };
  }
}
