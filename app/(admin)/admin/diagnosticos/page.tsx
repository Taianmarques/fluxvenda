import { prisma } from "@/lib/prisma";
import Link from "next/link";

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  CRITICO:    { label: "Crítico",    color: "bg-red-900/40 text-red-300 border-red-800/50" },
  ATENCAO:    { label: "Atenção",    color: "bg-yellow-900/40 text-yellow-300 border-yellow-800/50" },
  BOM:        { label: "Bom",        color: "bg-blue-900/40 text-blue-300 border-blue-800/50" },
  EXCELENTE:  { label: "Excelente",  color: "bg-green-900/40 text-green-300 border-green-800/50" },
};

export default async function AdminDiagnosticosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const { q, tipo } = await searchParams;
  const query = (q ?? "").trim();

  const diagnostics = await prisma.diagnostic.findMany({
    where: {
      ...(tipo ? { diagnosticType: tipo } : {}),
      ...(query ? {
        OR: [
          { companyName: { contains: query, mode: "insensitive" } },
          { segment: { contains: query, mode: "insensitive" } },
          { profile: { name: { contains: query, mode: "insensitive" } } },
          { profile: { email: { contains: query, mode: "insensitive" } } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      profile: { select: { name: true, email: true } },
      result: { select: { priority: true, summary: true } },
    },
  });

  const totalPorTipo = {
    EMPRESA:  diagnostics.filter(d => d.diagnosticType === "EMPRESA").length,
    VENDEDOR: diagnostics.filter(d => d.diagnosticType === "VENDEDOR").length,
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm">Scanner / Diagnósticos</p>
            <h1 className="text-3xl font-bold mt-1">Diagnósticos ({diagnostics.length})</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <form className="flex gap-2">
              <input type="hidden" name="tipo" value={tipo ?? ""} />
              <input
                type="text" name="q" defaultValue={query}
                placeholder="Buscar empresa, segmento ou usuário..."
                className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm w-72 focus:outline-none focus:border-blue-600"
              />
            </form>
            <div className="flex gap-2">
              {([["", "Todos"], ["EMPRESA", "Empresa"], ["VENDEDOR", "Vendedor"]] as const).map(([val, lbl]) => (
                <Link
                  key={val}
                  href={`/admin/diagnosticos${val ? `?tipo=${val}` : ""}${query ? `${val ? "&" : "?"}q=${query}` : ""}`}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${tipo === val || (!tipo && val === "") ? "border-blue-600 bg-blue-950/30 text-blue-300" : "border-gray-800 text-gray-400 hover:text-white"}`}
                >
                  {lbl}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-3xl font-bold text-blue-400">{diagnostics.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total de diagnósticos</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-3xl font-bold text-purple-400">{totalPorTipo.EMPRESA}</p>
            <p className="text-xs text-gray-500 mt-1">Diagnósticos de empresa</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-3xl font-bold text-amber-400">{totalPorTipo.VENDEDOR}</p>
            <p className="text-xs text-gray-500 mt-1">Diagnósticos de vendedor</p>
          </div>
        </div>

        {/* Lista */}
        {diagnostics.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-12 text-center text-gray-500">
            Nenhum diagnóstico encontrado.
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="text-left px-5 py-3">Empresa / Usuário</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Segmento</th>
                  <th className="text-center px-4 py-3">Score</th>
                  <th className="text-center px-4 py-3">Prioridade</th>
                  <th className="text-right px-5 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {diagnostics.map(d => {
                  const p = d.result?.priority ? PRIORITY_LABEL[d.result.priority] : null;
                  return (
                    <tr key={d.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium truncate max-w-[200px]">{d.companyName}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{d.profile.name} • {d.profile.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${d.diagnosticType === "EMPRESA" ? "bg-purple-900/30 text-purple-300 border-purple-800/50" : "bg-amber-900/30 text-amber-300 border-amber-800/50"}`}>
                          {d.diagnosticType === "EMPRESA" ? "Empresa" : "Vendedor"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{d.segment || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-lg ${d.scoreTotal >= 70 ? "text-green-400" : d.scoreTotal >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                          {d.scoreTotal}
                        </span>
                        <span className="text-gray-600 text-xs">/100</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${p.color}`}>{p.label}</span>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-gray-500">
                        {new Date(d.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
