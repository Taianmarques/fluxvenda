import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminEmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const teams = await prisma.team.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { segment: { contains: query, mode: "insensitive" } },
            { manager: { name: { contains: query, mode: "insensitive" } } },
            { manager: { email: { contains: query, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      manager: { select: { name: true, email: true, plan: true } },
      members: { select: { id: true } },
    },
  });

  const PRODUCT_LABEL: Record<string, string> = { CRM: "CRM", PLATAFORMA: "Plataforma" };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm">Empresas cadastradas</p>
            <h1 className="text-3xl font-bold mt-1">Empresas ({teams.length})</h1>
          </div>
          <form className="flex-shrink-0">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Buscar por empresa, segmento ou gestor..."
              className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm w-80 focus:outline-none focus:border-blue-600"
            />
          </form>
        </div>

        {teams.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-12 text-center">
            <p className="text-5xl mb-3">🏢</p>
            <p className="font-semibold text-gray-300">Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map(team => (
              <Link
                key={team.id}
                href={`/admin/empresas/${team.id}`}
                className="flex items-center justify-between gap-4 bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-600 transition-colors flex-wrap"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{team.name}</p>
                  <p className="text-xs text-gray-500 truncate">{team.manager.name} • {team.manager.email}</p>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0 text-right">
                  <div>
                    <p className="text-sm font-medium">{team.businessModel}</p>
                    <p className="text-xs text-gray-500">{team.segment || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{team.members.length}</p>
                    <p className="text-xs text-gray-500">membros</p>
                  </div>
                  <div className="flex gap-1.5">
                    {team.productsOwned.length === 0 ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-800 text-gray-500 border border-gray-700">Nenhum produto</span>
                    ) : (
                      team.productsOwned.map(p => (
                        <span key={p} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          p === "CRM" ? "bg-emerald-900/40 text-emerald-300 border-emerald-800/50" : "bg-purple-900/40 text-purple-300 border-purple-800/50"
                        }`}>
                          {PRODUCT_LABEL[p]}
                        </span>
                      ))
                    )}
                    {team.crmTrialEndsAt && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        team.crmTrialEndsAt.getTime() < Date.now()
                          ? "bg-red-900/40 text-red-300 border-red-800/50"
                          : "bg-amber-900/40 text-amber-300 border-amber-800/50"
                      }`}>
                        {team.crmTrialEndsAt.getTime() < Date.now() ? "Trial expirado" : "Trial"}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-800/50">
                    {team.manager.plan}
                  </span>
                  <p className="text-xs text-gray-500 w-20">{new Date(team.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
