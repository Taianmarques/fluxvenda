import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function AdminEmpresaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      manager: {
        select: {
          id: true, name: true, email: true, phone: true, plan: true, planExpiresAt: true,
          xp: true, level: true, createdAt: true,
          diagnostics: { orderBy: { createdAt: "desc" }, take: 1, select: { scoreTotal: true } },
        },
      },
      members: {
        include: {
          profile: {
            select: { id: true, name: true, email: true, role: true, xp: true, level: true, createdAt: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      goals: { orderBy: { createdAt: "desc" }, take: 5 },
      announcements: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!team) notFound();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <Link href="/admin/empresas" className="text-xs text-gray-500 hover:text-gray-300">← Empresas</Link>
          <div className="flex items-start justify-between flex-wrap gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-bold">{team.name}</h1>
              <p className="text-gray-400">{team.businessModel} • {team.segment || "—"}{team.subsegment ? ` / ${team.subsegment}` : ""} • {team.size} pessoas</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-800/50">
              Plano {team.manager.plan}
            </span>
          </div>
        </div>

        {/* Gestor */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Gestor responsável</p>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold">{team.manager.name}</p>
              <p className="text-sm text-gray-400">{team.manager.email}{team.manager.phone ? ` • ${team.manager.phone}` : ""}</p>
            </div>
            <div className="text-right text-sm text-gray-400">
              <p>{team.manager.xp.toLocaleString("pt-BR")} XP • Nível {team.manager.level}</p>
              <p>Desde {new Date(team.manager.createdAt).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Membros", value: team.members.length, icon: "👥" },
            { label: "Metas",   value: team.goals.length, icon: "🎯" },
            { label: "Avisos",  value: team.announcements.length, icon: "📢" },
            { label: "Código de convite", value: team.invite, icon: "🔗", small: true },
          ].map(m => (
            <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-2xl mb-1">{m.icon}</p>
              <p className={`font-bold ${m.small ? "text-sm break-all" : "text-3xl"}`}>{m.value}</p>
              <p className="text-xs text-gray-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Membros */}
        <div>
          <h2 className="text-xl font-bold mb-4">Membros ({team.members.length})</h2>
          {team.members.length === 0 ? (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-8 text-center text-gray-500">
              Nenhum membro ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {team.members.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.profile.name}</p>
                    <p className="text-xs text-gray-500 truncate">{m.profile.email}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 flex-shrink-0">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-800 text-gray-300">{m.profile.role}</span>
                    <span>{m.profile.xp.toLocaleString("pt-BR")} XP</span>
                    <span className="text-xs text-gray-500">entrou em {new Date(m.joinedAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metas */}
        {team.goals.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Metas recentes</h2>
            <div className="space-y-2">
              {team.goals.map(g => (
                <div key={g.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-2">
                  <p className="font-medium">{g.title}</p>
                  <p className="text-sm text-gray-400">{g.current}/{g.target} {g.unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avisos */}
        {team.announcements.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Avisos recentes</h2>
            <div className="space-y-2">
              {team.announcements.map(a => (
                <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
