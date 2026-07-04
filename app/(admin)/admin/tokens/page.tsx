import { prisma } from "@/lib/prisma";
import { getMonthlyUsageByTeam } from "@/lib/token-usage";
import { revalidatePath } from "next/cache";
import { Cpu } from "lucide-react";

async function updateQuota(formData: FormData) {
  "use server";
  const teamId = formData.get("teamId") as string;
  const limitStr = (formData.get("monthlyTokenLimit") as string).trim();
  const limit = limitStr === "" ? null : parseInt(limitStr, 10);
  if (teamId) {
    await prisma.team.update({
      where: { id: teamId },
      data: { monthlyTokenLimit: limit !== null && !isNaN(limit) ? limit : null },
    });
  }
  revalidatePath("/admin/tokens");
}

export default async function AdminTokensPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number);
    year = y;
    month = m;
  }

  const mesValue = `${year}-${String(month).padStart(2, "0")}`;

  const [teams, usageData] = await Promise.all([
    prisma.team.findMany({
      select: {
        id: true,
        name: true,
        monthlyTokenLimit: true,
        manager: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    getMonthlyUsageByTeam(year, month),
  ]);

  const usageMap = new Map(usageData.map((u) => [u.teamId, u]));

  const rows = teams
    .map((team) => {
      const usage = usageMap.get(team.id) ?? {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
      const pct =
        team.monthlyTokenLimit && team.monthlyTokenLimit > 0
          ? (usage.totalTokens / team.monthlyTokenLimit) * 100
          : null;
      return { team, usage, pct };
    })
    .sort((a, b) => b.usage.costUsd - a.usage.costUsd);

  const totalTokens = rows.reduce((s, r) => s + r.usage.totalTokens, 0);
  const totalCost = rows.reduce((s, r) => s + r.usage.costUsd, 0);
  const teamsWithoutQuota = rows.filter((r) => r.team.monthlyTokenLimit === null).length;
  const teamsAbove80 = rows.filter((r) => r.pct !== null && r.pct >= 80).length;

  const cards = [
    { label: "Total tokens", value: totalTokens.toLocaleString("pt-BR") },
    { label: "Custo estimado", value: `$ ${totalCost.toFixed(4)}` },
    { label: "Sem cota definida", value: String(teamsWithoutQuota) },
    { label: "Acima de 80% da cota", value: String(teamsAbove80) },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Cpu className="text-red-400" size={28} />
            <div>
              <p className="text-gray-400 text-sm">Consumo de IA por equipe</p>
              <h1 className="text-3xl font-bold mt-0.5">Tokens</h1>
            </div>
          </div>
          <form className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Mês:</label>
            <input
              type="month"
              name="mes"
              defaultValue={mesValue}
              className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-3 py-2 text-sm transition-colors"
            >
              Filtrar
            </button>
          </form>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-gray-400 text-xs">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Empresa</th>
                  <th className="text-right px-5 py-3">Tokens</th>
                  <th className="text-right px-5 py-3">Custo USD</th>
                  <th className="text-right px-5 py-3">Cota mensal</th>
                  <th className="text-right px-5 py-3">% Cota</th>
                  <th className="px-5 py-3">Definir cota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {rows.map(({ team, usage, pct }) => (
                  <tr key={team.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium">{team.name}</p>
                      <p className="text-xs text-gray-500">{team.manager.name}</p>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300">
                      {usage.totalTokens.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300">
                      ${usage.costUsd.toFixed(4)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">
                      {team.monthlyTokenLimit
                        ? team.monthlyTokenLimit.toLocaleString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {pct === null ? (
                        <span className="text-gray-600 text-xs">—</span>
                      ) : (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            pct >= 100
                              ? "bg-red-900/40 text-red-400 border border-red-800/50"
                              : pct >= 80
                              ? "bg-yellow-900/40 text-yellow-400 border border-yellow-800/50"
                              : "bg-green-900/30 text-green-400 border border-green-800/40"
                          }`}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <form action={updateQuota} className="flex items-center gap-2">
                        <input type="hidden" name="teamId" value={team.id} />
                        <input
                          type="number"
                          name="monthlyTokenLimit"
                          defaultValue={team.monthlyTokenLimit ?? ""}
                          placeholder="sem limite"
                          min={1}
                          className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-600"
                        />
                        <button
                          type="submit"
                          className="text-xs bg-blue-900/40 hover:bg-blue-800/50 border border-blue-800/50 text-blue-300 rounded-lg px-2.5 py-1 transition-colors"
                        >
                          Salvar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="py-16 text-center text-gray-500 text-sm">
                Nenhuma equipe cadastrada
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
