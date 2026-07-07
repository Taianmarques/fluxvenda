import { prisma } from "@/lib/prisma";

const COSTS_PER_TOKEN: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini":       { input: 0.00000015, output: 0.0000006  },
  "claude-sonnet-4-6": { input: 0.000003,   output: 0.000015   },
};

export async function logTokenUsage(params: {
  teamId: string;
  provider: string;
  model: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  const rates = COSTS_PER_TOKEN[params.model] ?? { input: 0, output: 0 };
  const costUsd = params.inputTokens * rates.input + params.outputTokens * rates.output;
  const totalTokens = params.inputTokens + params.outputTokens;

  await prisma.tokenUsageLog.create({
    data: {
      teamId:       params.teamId,
      provider:     params.provider,
      model:        params.model,
      feature:      params.feature,
      inputTokens:  params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd,
    },
  });

  await debitCreditsIfOverPlan(params.teamId, totalTokens).catch(() => {});
}

// Se a equipe tem cota mensal definida e esse consumo (total ou parcialmente) veio depois
// que o uso do mês já tinha estourado o limite do plano, abate a diferença dos créditos
// extras comprados (saldo nunca fica negativo).
async function debitCreditsIfOverPlan(teamId: string, totalTokensJustLogged: number): Promise<void> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { monthlyTokenLimit: true, aiCreditsBalance: true },
  });
  if (!team || team.monthlyTokenLimit === null || team.aiCreditsBalance <= 0) return;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const agg = await prisma.tokenUsageLog.aggregate({
    where: { teamId, createdAt: { gte: start } },
    _sum: { inputTokens: true, outputTokens: true },
  });
  const monthlyUsedIncludingThisCall = (agg._sum.inputTokens ?? 0) + (agg._sum.outputTokens ?? 0);
  const overage = Math.min(totalTokensJustLogged, Math.max(0, monthlyUsedIncludingThisCall - team.monthlyTokenLimit));
  if (overage <= 0) return;

  await prisma.team.update({
    where: { id: teamId },
    data: { aiCreditsBalance: { decrement: Math.min(overage, team.aiCreditsBalance) } },
  });
}

export async function getTeamIdForUser(userId: string): Promise<string | null> {
  const member = await prisma.teamMember.findFirst({
    where: { profileId: userId },
    select: { teamId: true },
  });
  return member?.teamId ?? null;
}

export async function isOverQuota(teamId: string): Promise<boolean> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { monthlyTokenLimit: true, aiCreditsBalance: true },
  });

  if (!team || team.monthlyTokenLimit === null) return false;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const agg = await prisma.tokenUsageLog.aggregate({
    where: { teamId, createdAt: { gte: start } },
    _sum: { inputTokens: true, outputTokens: true },
  });

  const total = (agg._sum.inputTokens ?? 0) + (agg._sum.outputTokens ?? 0);
  if (total < team.monthlyTokenLimit) return false;
  // Estourou a cota do plano, mas tem créditos extras comprados — libera mesmo assim
  // (o consumo é abatido do saldo em debitCreditsIfOverPlan, chamado por logTokenUsage)
  return team.aiCreditsBalance <= 0;
}

// Status de uso/créditos para a tela "Créditos de IA" do gestor
export async function getCreditsStatus(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { monthlyTokenLimit: true, aiCreditsBalance: true },
  });

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const agg = await prisma.tokenUsageLog.aggregate({
    where: { teamId, createdAt: { gte: start } },
    _sum: { inputTokens: true, outputTokens: true },
  });
  const monthlyUsed = (agg._sum.inputTokens ?? 0) + (agg._sum.outputTokens ?? 0);

  return {
    monthlyTokenLimit: team?.monthlyTokenLimit ?? null,
    monthlyUsed,
    aiCreditsBalance: team?.aiCreditsBalance ?? 0,
    overPlan: team?.monthlyTokenLimit != null && monthlyUsed >= team.monthlyTokenLimit,
  };
}

export async function getMonthlyUsageByTeam(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 1);

  const logs = await prisma.tokenUsageLog.groupBy({
    by: ["teamId"],
    where: { createdAt: { gte: start, lt: end } },
    _sum: { inputTokens: true, outputTokens: true, costUsd: true },
  });

  return logs.map((l) => ({
    teamId:       l.teamId,
    inputTokens:  l._sum.inputTokens  ?? 0,
    outputTokens: l._sum.outputTokens ?? 0,
    costUsd:      l._sum.costUsd      ?? 0,
    totalTokens:  (l._sum.inputTokens ?? 0) + (l._sum.outputTokens ?? 0),
  }));
}
