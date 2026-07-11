import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateMissionsFromDiagnostic } from "@/lib/missoes";
import { MissoesClient } from "./MissoesClient";
import Link from "next/link";
import { ProductGate } from "../ProductGate";

export default async function MissoesPage() {
  const user = await currentUser();
  const profileId = user!.id;

  // Busca missões ativas do scanner
  let userMissions = await prisma.userMission.findMany({
    where: { profileId, mission: { condition: { contains: '"type":"scanner"' } } },
    include: { mission: true },
    orderBy: [{ completed: "asc" }, { mission: { xpReward: "desc" } }],
  });

  // Sincroniza missões com o diagnóstico mais recente (cria as que faltam, remove as de diagnósticos antigos)
  const lastDiagnostic = await prisma.diagnostic.findFirst({
    where: { profileId },
    orderBy: { createdAt: "desc" },
  });

  if (lastDiagnostic) {
    const areaScores: Record<string, number> = {
      leads: lastDiagnostic.scoreLeads,
      process: lastDiagnostic.scoreProcess,
      team: lastDiagnostic.scoreTeam,
      kpis: lastDiagnostic.scoreKpis,
      tools: lastDiagnostic.scoreTools,
      value: lastDiagnostic.scoreValue,
      retention: lastDiagnostic.scoreRetention,
      ...(lastDiagnostic.diagnosticType === "EMPRESA" ? { money: lastDiagnostic.scoreMoney } : {}),
    };
    await generateMissionsFromDiagnostic(
      profileId,
      lastDiagnostic.id,
      lastDiagnostic.diagnosticType as "EMPRESA" | "VENDEDOR",
      areaScores,
    );
    userMissions = await prisma.userMission.findMany({
      where: { profileId, mission: { condition: { contains: '"type":"scanner"' } } },
      include: { mission: true },
      orderBy: [{ completed: "asc" }, { mission: { xpReward: "desc" } }],
    });
  }

  // Busca contexto do diagnóstico mais recente para mostrar na página
  const diagnosticId = (() => {
    try {
      const c = JSON.parse(userMissions[0]?.mission.condition ?? "{}");
      return c.diagnosticId as string | undefined;
    } catch { return undefined; }
  })();

  const [diagnostic, ninetyDayPlan] = await Promise.all([
    diagnosticId
      ? prisma.diagnostic.findUnique({ where: { id: diagnosticId }, include: { result: true } })
      : Promise.resolve(null),
    diagnosticId
      ? prisma.ninetyDayPlan.findUnique({
          where: { diagnosticId },
          include: { actions: { orderBy: { order: "asc" } } },
        })
      : Promise.resolve(null),
  ]);

  const missoes = userMissions.map((um) => {
    let condition: Record<string, unknown> = {};
    try { condition = JSON.parse(um.mission.condition); } catch {}
    return {
      id: um.id,
      title: um.mission.title,
      description: um.mission.description,
      xpReward: um.mission.xpReward,
      condition: condition as {
        type: string; area: string; priority: "CRITICO" | "ATENCAO";
        diagnosticId: string; diagnosticType: "EMPRESA" | "VENDEDOR";
        link: string; linkLabel: string; score: number;
      },
      progress: um.progress,
      completed: um.completed,
      completedAt: um.completedAt?.toISOString() ?? null,
      solutionText: um.solutionText ?? null,
    };
  });

  // Resumo das áreas para mostrar no topo
  const areaLabels: Record<string, string> = {
    leads: "Geração de Leads", process: "Processo de Vendas", team: "Equipe / Negociação",
    kpis: "KPIs & Dados", tools: "Ferramentas", value: "Proposta de Valor",
    retention: "Retenção", money: "Dinheiro na Mesa",
  };

  return (
    <ProductGate product="PLATAFORMA">
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Plano de Ação Comercial</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Baseado no seu diagnóstico — resolva cada ponto crítico usando a plataforma.
          </p>
        </div>
        <Link
          href="/scanner/novo"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors"
        >
          + Novo diagnóstico
        </Link>
      </div>

      {/* Contexto do diagnóstico */}
      {diagnostic && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Diagnóstico base</p>
              <p className="font-semibold mt-0.5">
                {diagnostic.diagnosticType === "EMPRESA" ? `🏢 ${diagnostic.companyName}` : "🎯 Auto-diagnóstico"}
              </p>
              <p className="text-xs text-gray-400">
                {diagnostic.segment} •{" "}
                {new Date(diagnostic.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Score geral</p>
              <p className={`text-3xl font-black ${diagnostic.scoreTotal < 40 ? "text-red-400" : diagnostic.scoreTotal < 60 ? "text-yellow-400" : diagnostic.scoreTotal < 80 ? "text-blue-400" : "text-green-400"}`}>
                {diagnostic.scoreTotal}
              </p>
            </div>
          </div>

          {/* Áreas do diagnóstico com score */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {missoes.map((m) => {
              const area = m.condition.area;
              const score = m.condition.score;
              const isCritico = score < 40;
              return (
                <div key={area} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${isCritico ? "border-red-800 bg-red-950/20" : "border-yellow-800 bg-yellow-950/20"}`}>
                  <span className="text-gray-300">{areaLabels[area] ?? area}</span>
                  <span className={`font-bold ${isCritico ? "text-red-400" : "text-yellow-400"}`}>{score}/100</span>
                </div>
              );
            })}
          </div>

          <Link
            href={`/scanner/resultado/${diagnostic.id}`}
            className="block text-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ver diagnóstico completo →
          </Link>
        </div>
      )}

      {/* Missões */}
      <MissoesClient
        missoes={missoes}
        areaLabels={areaLabels}
        diagnosticId={diagnosticId ?? null}
        ninetyDayPlan={ninetyDayPlan?.content ?? null}
        planActions={
          ninetyDayPlan?.actions.map((a) => ({
            id: a.id,
            area: a.area,
            phase: a.phase,
            text: a.text,
            impact: a.impact,
            completed: a.completed,
            order: a.order,
          })) ?? []
        }
        diagnosticScores={
          diagnostic
            ? {
                scoreTotal: diagnostic.scoreTotal,
                leads: diagnostic.scoreLeads,
                process: diagnostic.scoreProcess,
                team: diagnostic.scoreTeam,
                kpis: diagnostic.scoreKpis,
                tools: diagnostic.scoreTools,
                value: diagnostic.scoreValue,
                retention: diagnostic.scoreRetention,
                money: diagnostic.scoreMoney,
              }
            : null
        }
        companyName={diagnostic?.companyName ?? "Minha Empresa"}
        segment={diagnostic?.segment ?? null}
      />
    </div>
    </ProductGate>
  );
}
