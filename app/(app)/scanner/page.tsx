import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function ScannerPage() {
  const user = await currentUser();

  const profile = await prisma.profile.findUnique({
    where: { id: user!.id },
    select: { role: true, teamMembership: { select: { team: { select: { managerId: true, name: true } } } } },
  });

  const isGestor = profile?.role === "GESTOR" || profile?.role === "ADMIN";

  // Diagnósticos próprios
  const myDiagnostics = await prisma.diagnostic.findMany({
    where: { profileId: user!.id },
    orderBy: { createdAt: "desc" },
    include: { result: true },
    take: 10,
  });

  // Diagnóstico do gestor da equipe (para vendedores)
  const gestorDiagnostic = !isGestor && profile?.teamMembership?.team?.managerId
    ? await prisma.diagnostic.findFirst({
        where: { profileId: profile.teamMembership.team.managerId },
        orderBy: { createdAt: "desc" },
        include: { result: true },
      })
    : null;

  const teamName = profile?.teamMembership?.team?.name;

  const priorityStyle = (p?: string) => {
    if (p === "CRITICO") return "border-red-700 text-red-400";
    if (p === "ATENCAO") return "border-yellow-700 text-yellow-400";
    if (p === "BOM") return "border-blue-700 text-blue-400";
    return "border-green-700 text-green-400";
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scanner de Vendas</h1>
          <p className="text-gray-400 mt-1">
            {isGestor ? "Diagnóstico de maturidade comercial da sua empresa" : "Diagnóstico individual da sua maturidade em vendas"}
          </p>
        </div>
        <Link href="/scanner/novo"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors">
          {isGestor ? "Novo diagnóstico da empresa" : "Fazer auto-diagnóstico"}
        </Link>
      </div>

      {/* Diagnóstico da empresa (para vendedores que têm gestor) */}
      {gestorDiagnostic && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-300">📊 Diagnóstico da empresa</span>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{teamName}</span>
          </div>
          <Link href={`/scanner/resultado/${gestorDiagnostic.id}`}
            className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-950/30 to-gray-900 border border-blue-800/50 rounded-xl hover:border-blue-600 transition-colors">
            <div>
              <p className="font-semibold">{gestorDiagnostic.companyName}</p>
              <p className="text-sm text-gray-400">{gestorDiagnostic.segment} • {gestorDiagnostic.teamSize}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(gestorDiagnostic.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-400">{gestorDiagnostic.scoreTotal}</p>
                <p className="text-xs text-gray-500">pontos</p>
              </div>
              {gestorDiagnostic.result && (
                <span className={`text-xs px-3 py-1 rounded-full border font-medium ${priorityStyle(gestorDiagnostic.result.priority)}`}>
                  {gestorDiagnostic.result.priority}
                </span>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* Meus diagnósticos */}
      <div className="space-y-3">
        {myDiagnostics.length > 0 && (
          <p className="text-sm font-semibold text-gray-300">
            {isGestor ? "Histórico de diagnósticos" : "Meus auto-diagnósticos"}
          </p>
        )}

        {myDiagnostics.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-5xl">
              {isGestor ? "📊" : "🎯"}
            </p>
            <p className="text-lg font-medium text-gray-300">
              {isGestor ? "Nenhum diagnóstico ainda" : "Você ainda não fez um auto-diagnóstico"}
            </p>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {isGestor
                ? "Faça o diagnóstico da maturidade comercial da sua empresa para identificar pontos críticos e gerar um plano de ação personalizado."
                : "O auto-diagnóstico avalia sua maturidade individual em vendas: prospecção, processo, uso de ferramentas, proposta de valor e mais."
              }
            </p>
            <Link href="/scanner/novo"
              className="inline-block mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors">
              {isGestor ? "Iniciar diagnóstico da empresa" : "Iniciar auto-diagnóstico"}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myDiagnostics.map(d => (
              <Link key={d.id} href={`/scanner/resultado/${d.id}`}
                className="flex items-center justify-between p-5 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-600 transition-colors">
                <div>
                  <p className="font-semibold">{d.companyName}</p>
                  <p className="text-sm text-gray-400">{d.segment} • {d.teamSize}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(d.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-400">{d.scoreTotal}</p>
                    <p className="text-xs text-gray-500">pontos</p>
                  </div>
                  {d.result && (
                    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${priorityStyle(d.result.priority)}`}>
                      {d.result.priority}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
