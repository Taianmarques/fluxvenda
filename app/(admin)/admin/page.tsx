import { prisma } from "@/lib/prisma";
import { PlatformWhatsappCard } from "./PlatformWhatsappCard";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default async function AdminDashboardPage() {
  const [
    totalEmpresas,
    totalUsuarios,
    roleCounts,
    planCounts,
    assinaturasAtivas,
    novasEmpresas30d,
    novosUsuarios30d,
    novosUsuarios7d,
    ultimasEmpresas,
  ] = await Promise.all([
    prisma.team.count(),
    prisma.profile.count(),
    prisma.profile.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.profile.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.profile.count({ where: { stripeSubscriptionId: { not: null } } }),
    prisma.team.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.profile.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.profile.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    prisma.team.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { manager: { select: { name: true, email: true } }, members: { select: { id: true } } },
    }),
  ]);

  const roleMap = Object.fromEntries(roleCounts.map(r => [r.role, r._count._all]));
  const planMap = Object.fromEntries(planCounts.map(p => [p.plan, p._count._all]));

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <p className="text-gray-400 text-sm">Visão geral</p>
          <h1 className="text-3xl font-bold mt-1">Dashboard</h1>
        </div>

        {/* Saúde do WhatsApp global (boas-vindas do cadastro) */}
        <PlatformWhatsappCard />

        {/* Métricas principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Empresas cadastradas", value: totalEmpresas, icon: "🏢", color: "text-blue-400" },
            { label: "Usuários totais",       value: totalUsuarios, icon: "👤", color: "text-purple-400" },
            { label: "Assinaturas ativas",    value: assinaturasAtivas, icon: "💳", color: "text-green-400" },
            { label: "Novos usuários (7d)",   value: novosUsuarios7d, icon: "✨", color: "text-yellow-400" },
          ].map(m => (
            <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-2xl mb-1">{m.icon}</p>
              <p className={`text-3xl font-bold ${m.color}`}>{m.value.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-gray-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Usuários por role */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <p className="font-semibold text-gray-300">Usuários por papel</p>
            {(["GESTOR", "FUNCIONARIO", "VENDEDOR", "ADMIN"] as const).map(role => {
              const count = roleMap[role] ?? 0;
              const pct = totalUsuarios ? Math.round((count / totalUsuarios) * 100) : 0;
              return (
                <div key={role}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{role}</span>
                    <span className="text-gray-300 font-medium">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Distribuição de planos */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <p className="font-semibold text-gray-300">Distribuição de planos</p>
            {(["FREE", "PRO", "TEAM"] as const).map(plan => {
              const count = planMap[plan] ?? 0;
              const pct = totalUsuarios ? Math.round((count / totalUsuarios) * 100) : 0;
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{plan}</span>
                    <span className="text-gray-300 font-medium">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Crescimento */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="font-semibold text-gray-300 mb-3">Crescimento (últimos 30 dias)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-blue-400">+{novasEmpresas30d}</p>
              <p className="text-xs text-gray-500">novas empresas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">+{novosUsuarios30d}</p>
              <p className="text-xs text-gray-500">novos usuários</p>
            </div>
          </div>
        </div>

        {/* Últimas empresas cadastradas */}
        <div>
          <h2 className="text-xl font-bold mb-4">Últimas empresas cadastradas</h2>
          {ultimasEmpresas.length === 0 ? (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-12 text-center">
              <p className="text-gray-500">Nenhuma empresa cadastrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ultimasEmpresas.map(team => (
                <a
                  key={team.id}
                  href={`/admin/empresas/${team.id}`}
                  className="flex items-center justify-between gap-4 bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-600 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{team.name}</p>
                    <p className="text-xs text-gray-500 truncate">{team.manager.name} • {team.manager.email}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    <div>
                      <p className="text-sm font-medium">{team.members.length}</p>
                      <p className="text-xs text-gray-500">membros</p>
                    </div>
                    <p className="text-xs text-gray-500">{new Date(team.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
