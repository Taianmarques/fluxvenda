import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getEffectiveProducts, hasProduct } from "@/lib/products";
import { listMyAgentConfigs } from "@/lib/team";
import { CrmWelcome } from "./CrmWelcome";

export default async function DashboardPage() {
  const user = await currentUser();

  // Quem não tem Plataforma não vê o dashboard de treinamento (XP, missões, trilhas) —
  // isso não faz sentido pra quem só contratou o CRM. Mostra uma home orientada a criar
  // o primeiro agente de IA em vez disso.
  const products = await getEffectiveProducts(user!.id);
  if (!hasProduct(products, "PLATAFORMA")) {
    const result = await listMyAgentConfigs(user!.id);
    return <CrmWelcome firstName={user?.firstName ?? ""} agentCount={result?.configs.length ?? 0} />;
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user!.id },
    include: {
      progress: true,
      xpTransactions: { orderBy: { createdAt: "desc" }, take: 5 },
      userBadges: { include: { badge: true }, take: 4 },
      userMissions: {
        where: { completed: false, mission: { condition: { contains: '"type":"scanner"' } } },
        include: { mission: true },
        orderBy: { mission: { xpReward: "desc" } },
        take: 3,
      },
    },
  });

  const activeMissions = (profile?.userMissions ?? []).map((um) => {
    let condition: Record<string, unknown> = {};
    try { condition = JSON.parse(um.mission.condition); } catch {}
    return { id: um.id, title: um.mission.title, xpReward: um.mission.xpReward, condition };
  });

  const PRIORITY_BADGE: Record<string, string> = {
    CRITICO: "text-red-400 bg-red-950/50 border border-red-800",
    ATENCAO: "text-yellow-400 bg-yellow-950/50 border border-yellow-800",
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Olá, {user?.firstName}!</h1>
        <p className="text-gray-400 mt-1">Aqui está o seu progresso.</p>
      </div>

      {/* XP e level */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nível</p>
          <p className="text-4xl font-bold text-blue-400">{profile?.level ?? 1}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">XP Total</p>
          <p className="text-4xl font-bold text-green-400">{profile?.xp ?? 0}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Trilhas concluídas</p>
          <p className="text-4xl font-bold text-purple-400">
            {profile?.progress.filter((p) => p.completed).length ?? 0}
          </p>
        </div>
      </div>

      {/* Plano de Evolução — missões ativas */}
      {activeMissions.length > 0 ? (
        <div className="bg-gray-900 border border-blue-900/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base">🎯 Seu plano de evolução comercial</h2>
              <p className="text-xs text-gray-400 mt-0.5">Missões geradas pelo diagnóstico — conclua para ganhar XP</p>
            </div>
            <Link href="/missoes" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-3">
            {activeMissions.map((m) => {
              const priority = (m.condition.priority as string) ?? "ATENCAO";
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.ATENCAO}`}>
                      {priority === "CRITICO" ? "Crítico" : "Atenção"}
                    </span>
                    <span className="text-sm text-gray-200 truncate">{m.title}</span>
                  </div>
                  <span className="flex-shrink-0 text-sm font-bold text-yellow-400">+{m.xpReward} XP</span>
                </div>
              );
            })}
          </div>
          <Link
            href="/missoes"
            className="block w-full text-center py-2.5 border border-blue-700 hover:border-blue-500 text-blue-400 hover:text-blue-300 rounded-xl text-sm font-medium transition-colors"
          >
            Ver plano completo e concluir missões
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl p-6 text-center space-y-3">
          <p className="text-2xl">📊</p>
          <p className="font-semibold text-sm">Nenhum plano de evolução ativo</p>
          <p className="text-xs text-gray-400">Faça um diagnóstico no scanner para gerar seu plano personalizado de melhorias.</p>
          <Link href="/scanner/novo" className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors mt-1">
            Fazer diagnóstico →
          </Link>
        </div>
      )}

      {/* Badges */}
      {(profile?.userBadges.length ?? 0) > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-sm text-gray-300 uppercase tracking-wide">Conquistas recentes</h2>
          <div className="flex gap-4">
            {profile?.userBadges.map(({ badge }) => (
              <div key={badge.id} className="flex flex-col items-center gap-1" title={badge.description}>
                <span className="text-3xl">{badge.icon}</span>
                <span className="text-xs text-gray-400">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/scanner/novo", label: "Fazer scanner", icon: "📊" },
          { href: "/objecoes", label: "Treinar objeção", icon: "💬" },
          { href: "/scripts", label: "Gerar script", icon: "✍️" },
          { href: "/trilhas", label: "Ver trilhas", icon: "📚" },
        ].map((a) => (
          <a
            key={a.href}
            href={a.href}
            className="flex flex-col items-center gap-2 p-5 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-600 transition-colors text-center"
          >
            <span className="text-3xl">{a.icon}</span>
            <span className="text-sm text-gray-300">{a.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
