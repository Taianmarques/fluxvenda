import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

const AREAS_EMPRESA = [
  { key: "leads",     label: "Geração de Leads",    scoreKey: "scoreLeads"     },
  { key: "process",   label: "Processo de Vendas",  scoreKey: "scoreProcess"   },
  { key: "team",      label: "Equipe",               scoreKey: "scoreTeam"      },
  { key: "kpis",      label: "KPIs & Dados",         scoreKey: "scoreKpis"      },
  { key: "tools",     label: "Ferramentas",           scoreKey: "scoreTools"     },
  { key: "value",     label: "Proposta de Valor",    scoreKey: "scoreValue"     },
  { key: "retention", label: "Retenção",              scoreKey: "scoreRetention" },
  { key: "money",     label: "Dinheiro na Mesa",      scoreKey: "scoreMoney"     },
];

const AREAS_VENDEDOR = [
  { key: "leads",     label: "Prospecção Ativa",         scoreKey: "scoreLeads"     },
  { key: "process",   label: "Qualificação",              scoreKey: "scoreProcess"   },
  { key: "value",     label: "Pitch & Proposta",          scoreKey: "scoreValue"     },
  { key: "team",      label: "Negociação & Objeções",     scoreKey: "scoreTeam"      },
  { key: "kpis",      label: "Fechamento & Follow-up",    scoreKey: "scoreKpis"      },
  { key: "tools",     label: "Ferramentas",               scoreKey: "scoreTools"     },
  { key: "retention", label: "Desenvolvimento Contínuo",  scoreKey: "scoreRetention" },
];

const PRIORITY_BADGE: Record<string, string> = {
  CRITICO:   "bg-red-900/40 text-red-300 border-red-800/50",
  ATENCAO:   "bg-yellow-900/40 text-yellow-300 border-yellow-800/50",
  BOM:       "bg-blue-900/40 text-blue-300 border-blue-800/50",
  EXCELENTE: "bg-green-900/40 text-green-300 border-green-800/50",
  ALTA:      "bg-red-900/40 text-red-300 border-red-800/50",
  MEDIA:     "bg-yellow-900/40 text-yellow-300 border-yellow-800/50",
  BAIXA:     "bg-blue-900/40 text-blue-300 border-blue-800/50",
};

const CLASS_COLOR: Record<string, string> = {
  CRITICO: "bg-red-500",
  ATENCAO: "bg-yellow-500",
  FORTE:   "bg-green-500",
};

export default async function AdminDiagnosticoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const diag = await prisma.diagnostic.findUnique({
    where: { id },
    include: {
      profile: { select: { name: true, email: true } },
      result: true,
    },
  });

  if (!diag) notFound();

  const isVendedor = diag.diagnosticType === "VENDEDOR";
  const AREAS = isVendedor ? AREAS_VENDEDOR : AREAS_EMPRESA;

  const result = diag.result;
  const classification: Record<string, string> = result?.classification
    ? JSON.parse(result.classification)
    : {};
  const insights: Record<string, string> = result?.insights
    ? JSON.parse(result.insights)
    : {};
  const strengths: string[] = result?.strengths ? JSON.parse(result.strengths) : [];
  const weaknesses: string[] = result?.weaknesses ? JSON.parse(result.weaknesses) : [];
  const actions: { title: string; area: string; priority: string; description: string; timeframe: string }[] =
    result?.actions ? JSON.parse(result.actions) : [];

  const scoreColor = (s: number) => s >= 70 ? "text-green-400" : s >= 40 ? "text-yellow-400" : "text-red-400";
  const barColor = (cls?: string) => CLASS_COLOR[cls ?? ""] ?? "bg-blue-500";

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <Link href="/admin/diagnosticos" className="text-xs text-gray-500 hover:text-gray-300">
            ← Diagnósticos
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-4 mt-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full border border-gray-700 text-gray-400">
                  {isVendedor ? "Diagnóstico individual" : "Diagnóstico empresarial"}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(diag.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </div>
              <h1 className="text-3xl font-bold">{diag.companyName}</h1>
              <p className="text-gray-400">
                {diag.profile.name} • {diag.profile.email}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {diag.segment}{diag.teamSize ? ` • ${diag.teamSize} pessoas` : ""}
              </p>
            </div>
            {result?.priority && (
              <span className={`text-sm font-semibold px-4 py-2 rounded-xl border ${PRIORITY_BADGE[result.priority]}`}>
                {result.priority}
              </span>
            )}
          </div>
        </div>

        {/* Score geral + resumo */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-center flex-shrink-0">
              <p className={`text-7xl font-bold ${scoreColor(diag.scoreTotal)}`}>{diag.scoreTotal}</p>
              <p className="text-gray-400 text-sm mt-1">Score geral</p>
            </div>
            <div className="flex-1 min-w-0">
              {result?.summary && (
                <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
              )}
            </div>
          </div>
        </div>

        {/* Scores por área */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold">Scores por área</h2>
          {AREAS.map(a => {
            const score = (diag as Record<string, unknown>)[a.scoreKey] as number;
            const cls = classification[a.key];
            return (
              <div key={a.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{a.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${scoreColor(score)}`}>{score}</span>
                    {cls && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_BADGE[cls]}`}>
                        {cls === "FORTE" ? "Forte" : cls === "ATENCAO" ? "Atenção" : "Crítico"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor(cls)}`} style={{ width: `${score}%` }} />
                </div>
                {insights[a.key] && (
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{insights[a.key]}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Pontos fortes e fracos */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="grid md:grid-cols-2 gap-6">
            {strengths.length > 0 && (
              <div className="bg-green-950/20 border border-green-800 rounded-2xl p-5 space-y-3">
                <h2 className="font-semibold text-green-300">Pontos fortes</h2>
                <ul className="space-y-2">
                  {strengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-green-400 flex-shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div className="bg-red-950/20 border border-red-800 rounded-2xl p-5 space-y-3">
                <h2 className="font-semibold text-red-300">Principais fraquezas</h2>
                <ul className="space-y-2">
                  {weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-red-400 flex-shrink-0">•</span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Plano de ação */}
        {actions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Plano de ação personalizado</h2>
            <div className="space-y-3">
              {actions.map((action, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="text-blue-400 font-bold text-lg">{i + 1}</span>
                      <div>
                        <p className="font-semibold">{action.title}</p>
                        <p className="text-xs text-gray-500">{action.area} • {action.timeframe}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${PRIORITY_BADGE[action.priority] ?? ""}`}>
                      {action.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed pl-8">{action.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
