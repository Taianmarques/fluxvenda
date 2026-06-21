import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openai, MODEL } from "@/lib/openai";
import { levelFromXP } from "@/lib/utils";
import { getAreaScore } from "@/lib/diagnostic-score";

const AREA_LABELS: Record<string, string> = {
  leads: "Geração de Leads", process: "Processo de Vendas", team: "Equipe / Negociação",
  kpis: "KPIs & Dados", tools: "Ferramentas", value: "Proposta de Valor",
  retention: "Retenção", money: "Dinheiro na Mesa",
};
const VALID_AREAS = new Set(Object.keys(AREA_LABELS));

const XP_BONUS = 300;

type RawAction = { area: string; phase: number; text: string };

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { diagnosticId } = (await req.json()) as { diagnosticId: string };
  if (!diagnosticId) return NextResponse.json({ error: "diagnosticId obrigatório" }, { status: 400 });

  const existing = await prisma.ninetyDayPlan.findUnique({
    where: { diagnosticId },
    include: { actions: { orderBy: { order: "asc" } } },
  });
  if (existing) {
    return NextResponse.json({ content: existing.content, actions: existing.actions, xpGained: 0, alreadyExisted: true });
  }

  const [diagnostic, missions, profile] = await Promise.all([
    prisma.diagnostic.findFirst({ where: { id: diagnosticId, profileId: userId } }),
    prisma.userMission.findMany({
      where: {
        profileId: userId,
        mission: {
          AND: [
            { condition: { contains: '"type":"scanner"' } },
            { condition: { contains: `"diagnosticId":"${diagnosticId}"` } },
          ],
        },
      },
      include: { mission: true },
    }),
    prisma.profile.findUnique({ where: { id: userId }, select: { segment: true } }),
  ]);

  if (!diagnostic) return NextResponse.json({ error: "Diagnóstico não encontrado" }, { status: 404 });
  if (missions.length === 0 || missions.some((m) => !m.completed)) {
    return NextResponse.json({ error: "Conclua todos os desafios antes de gerar o plano de 90 dias" }, { status: 400 });
  }

  const segment = profile?.segment ?? diagnostic.segment ?? "B2B";

  const areasSummary = missions
    .map((m) => {
      let condition: Record<string, unknown> = {};
      try { condition = JSON.parse(m.mission.condition); } catch {}
      const area = condition.area as string;
      const score = condition.score as number;
      return `ÁREA (chave "${area}"): ${AREA_LABELS[area] ?? area} (score inicial ${score}/100)\nSOLUÇÃO JÁ CONSTRUÍDA:\n${m.solutionText ?? "(sem detalhes)"}`;
    })
    .join("\n\n---\n\n");

  const prompt = `Você é um consultor sênior de vendas B2B especializado no segmento "${segment}".

A empresa "${diagnostic.companyName}" concluiu um diagnóstico comercial completo (score geral: ${diagnostic.scoreTotal}/100) e já resolveu, com sua ajuda, ${missions.length} desafios práticos — um para cada área fraca identificada. Veja o que já foi construído em cada área:

${areasSummary}

TAREFA:
Crie um PLANO DE AÇÃO DE 90 DIAS que integre todas essas soluções em uma execução sequencial e realista, para mudar o cenário comercial da empresa. Responda em JSON com este formato exato:

{
  "narrative": "texto do plano formatado com **TÍTULO** para cada seção e '-' para listas, dividido em DIAS 1-30, DIAS 31-60, DIAS 61-90, cada fase com 1 meta numérica, terminando com uma seção COMO MEDIR O SUCESSO",
  "actions": [
    { "area": "chave_da_area_exatamente_como_informada_acima", "phase": 1, "text": "ação concreta e específica, executável e verificável pelo gestor" }
  ]
}

Regras para "actions":
- Gere entre 3 e 6 ações por área listada acima, distribuídas nas fases 1, 2 ou 3 (use o número 1, 2 ou 3) de forma coerente com a narrativa.
- Cada ação deve ser um passo concreto, curto (1 frase), extraído das soluções já construídas — não invente do zero.
- "area" deve ser exatamente uma das chaves informadas entre parênteses acima (ex: "leads", "process", etc).

Seja direto e específico para o segmento "${segment}". Não inclua texto fora do JSON.`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 2400,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { narrative?: string; actions?: RawAction[] } = {};
  try { parsed = JSON.parse(raw); } catch {}

  const content = parsed.narrative ?? "";

  const validAreasInPlan = missions
    .map((m) => {
      let condition: Record<string, unknown> = {};
      try { condition = JSON.parse(m.mission.condition); } catch {}
      return condition.area as string;
    })
    .filter((area) => VALID_AREAS.has(area));

  const sanitizedActions = (parsed.actions ?? []).filter(
    (a): a is RawAction =>
      !!a && typeof a.text === "string" && a.text.trim().length > 0 &&
      validAreasInPlan.includes(a.area) &&
      [1, 2, 3].includes(a.phase),
  );

  const countByArea = new Map<string, number>();
  for (const a of sanitizedActions) countByArea.set(a.area, (countByArea.get(a.area) ?? 0) + 1);

  const actionsData = sanitizedActions.map((a, index) => {
    const currentScore = getAreaScore(diagnostic, a.area);
    const count = countByArea.get(a.area) ?? 1;
    const impact = Math.max(1, Math.round((100 - currentScore) / count));
    return {
      area: a.area,
      phase: a.phase,
      text: a.text.trim(),
      impact,
      order: index,
    };
  });

  const plan = await prisma.ninetyDayPlan.create({
    data: {
      profileId: userId,
      diagnosticId,
      content,
      actions: { create: actionsData },
    },
    include: { actions: { orderBy: { order: "asc" } } },
  });

  const [, updatedProfile] = await prisma.$transaction([
    prisma.xPTransaction.create({
      data: { profileId: userId, amount: XP_BONUS, reason: "Plano de 90 dias gerado", source: "MISSION_COMPLETE" },
    }),
    prisma.profile.update({ where: { id: userId }, data: { xp: { increment: XP_BONUS } } }),
  ]);

  const newLevel = levelFromXP(updatedProfile.xp);
  if (newLevel > updatedProfile.level) {
    await prisma.profile.update({ where: { id: userId }, data: { level: newLevel } });
  }

  return NextResponse.json({ content: plan.content, actions: plan.actions, xpGained: XP_BONUS, alreadyExisted: false });
}
