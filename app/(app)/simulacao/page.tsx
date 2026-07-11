import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ProductGate } from "../ProductGate";

export default async function SimulacaoPage() {
  const user = await currentUser();

  const profile = await prisma.profile.findUnique({
    where: { id: user!.id },
    select: { role: true },
  });

  const isVendedor = profile?.role === "VENDEDOR";

  const company = await prisma.virtualCompany.findUnique({
    where: { profileId: user!.id },
    include: {
      rounds: { orderBy: { month: "asc" }, include: { decisions: true } },
    },
  });

  // Vendedor sem sessão → CTA direto (auto-setup na API)
  if (!company) {
    return (
      <ProductGate product="PLATAFORMA">
      <div className="p-8 max-w-3xl mx-auto text-center space-y-6 py-20">
        <p className="text-5xl">🎮</p>
        <h1 className="text-2xl font-bold">
          {isVendedor ? "Simulação de Vendas" : "Simulação Gamificada"}
        </h1>
        <p className="text-gray-400">
          {isVendedor
            ? "Pratique situações reais de vendas com IA. Cada rodada é um cenário diferente: cold call, discovery, proposta, negociação. Tome decisões e veja o impacto em tempo real."
            : "Gerencie uma empresa virtual de vendas e tome decisões estratégicas mês a mês com feedback de IA."}
        </p>
        {isVendedor ? (
          <Link
            href="/simulacao/jogar"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
          >
            🎯 Iniciar simulação de vendas
          </Link>
        ) : (
          <Link
            href="/simulacao/nova"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
          >
            Criar empresa virtual
          </Link>
        )}
      </div>
      </ProductGate>
    );
  }

  const totalRounds = company.rounds.length;
  const bestRound = company.rounds.reduce((best, r) => {
    const pct = r.mrrBefore > 0 ? ((r.mrrAfter - r.mrrBefore) / r.mrrBefore) * 100 : 0;
    const bestPct = best && best.mrrBefore > 0 ? ((best.mrrAfter - best.mrrBefore) / best.mrrBefore) * 100 : -Infinity;
    return pct > bestPct ? r : best;
  }, company.rounds[0]);

  return (
    <ProductGate product="PLATAFORMA">
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isVendedor ? "Simulação de Vendas" : company.name}
          </h1>
          <p className="text-gray-400">
            {isVendedor
              ? `${company.segment} • Rodada ${company.currentMonth}`
              : `${company.segment} • Mês ${company.currentMonth}`}
          </p>
        </div>
        <Link
          href="/simulacao/jogar"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
        >
          {isVendedor ? `Jogar rodada ${company.currentMonth}` : `Jogar mês ${company.currentMonth}`}
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {isVendedor ? (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">Score atual</p>
              <p className="text-3xl font-bold text-blue-400">{Math.round(company.currentMRR)} pts</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">Rodadas jogadas</p>
              <p className="text-3xl font-bold text-purple-400">{totalRounds}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">Melhor resultado</p>
              <p className="text-3xl font-bold text-green-400">
                {bestRound && bestRound.mrrBefore > 0
                  ? `+${Math.round(((bestRound.mrrAfter - bestRound.mrrBefore) / bestRound.mrrBefore) * 100)}%`
                  : "—"}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">MRR Atual</p>
              <p className="text-3xl font-bold text-green-400">
                R$ {company.currentMRR.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">Mês atual</p>
              <p className="text-3xl font-bold text-blue-400">{company.currentMonth}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">Rodadas jogadas</p>
              <p className="text-3xl font-bold text-purple-400">{totalRounds}</p>
            </div>
          </>
        )}
      </div>

      {company.rounds.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold">Histórico</h2>
          <div className="space-y-2">
            {company.rounds.slice().reverse().map((r) => {
              const pct = r.mrrBefore > 0 ? Math.round(((r.mrrAfter - r.mrrBefore) / r.mrrBefore) * 100) : 0;
              return (
                <div key={r.id} className="flex justify-between py-2 border-b border-gray-800 last:border-0">
                  <span className="text-sm text-gray-400">
                    {isVendedor ? `Rodada ${r.month}` : `Mês ${r.month}`}
                  </span>
                  {isVendedor ? (
                    <span className={`text-sm font-medium ${pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {pct >= 0 ? "+" : ""}{pct}% desempenho
                    </span>
                  ) : (
                    <span className="text-sm">
                      R$ {r.mrrBefore.toLocaleString("pt-BR")} →{" "}
                      <span className={r.mrrAfter >= r.mrrBefore ? "text-green-400" : "text-red-400"}>
                        R$ {r.mrrAfter.toLocaleString("pt-BR")}
                      </span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </ProductGate>
  );
}
