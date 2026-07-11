import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CopyInviteButton } from "./CopyInviteButton";
import { ProductGate } from "../ProductGate";

function getSalesLevel(score: number) {
  if (score >= 75) return { label: "Sênior", icon: "⭐", color: "text-yellow-300", border: "border-yellow-600", bg: "bg-yellow-900/30" };
  if (score >= 50) return { label: "Pleno",  icon: "🔥", color: "text-blue-300",   border: "border-blue-600",   bg: "bg-blue-900/30" };
  return               { label: "Júnior", icon: "🌱", color: "text-orange-300", border: "border-orange-600", bg: "bg-orange-900/30" };
}

export default async function GestorPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) redirect("/dashboard");

  const team = await prisma.team.findUnique({
    where: { managerId: user.id },
    include: {
      members: {
        include: {
          profile: {
            select: {
              id: true, name: true, email: true, xp: true, level: true,
              diagnostics: { orderBy: { createdAt: "desc" }, take: 1, select: { scoreTotal: true, diagnosticType: true } },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  const inviteLink = team ? `${process.env.NEXT_PUBLIC_APP_URL}/entrar/${team.invite}` : "";
  const members = team?.members ?? [];
  const avgXP = members.length ? Math.round(members.reduce((s, m) => s + m.profile.xp, 0) / members.length) : 0;
  const topMember = [...members].sort((a, b) => b.profile.xp - a.profile.xp)[0];
  const withDiag = members.filter(m => m.profile.diagnostics.length > 0);
  const avgScore = withDiag.length
    ? Math.round(withDiag.reduce((s, m) => s + (m.profile.diagnostics[0]?.scoreTotal ?? 0), 0) / withDiag.length)
    : null;

  return (
    <ProductGate product="PLATAFORMA">
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm">Painel do Gestor</p>
            <h1 className="text-3xl font-bold mt-1">{team?.name ?? profile.name}</h1>
            <p className="text-gray-400">{team?.segment}{team?.size ? ` • ${team.size} pessoas` : ""}</p>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Membros",         value: members.length,                             icon: "👥", color: "text-blue-400" },
            { label: "XP médio",        value: avgXP.toLocaleString("pt-BR"),              icon: "⭐", color: "text-yellow-400" },
            { label: "Score médio",     value: avgScore != null ? `${avgScore}/100` : "—", icon: "📊", color: "text-green-400" },
            { label: "Com diagnóstico", value: withDiag.length,                            icon: "🔍", color: "text-purple-400" },
          ].map(m => (
            <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-2xl mb-1">{m.icon}</p>
              <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-gray-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Link de convite */}
        {team && (
          <div className="bg-gradient-to-r from-blue-950/40 to-purple-950/40 border border-blue-800/50 rounded-2xl p-5 space-y-3">
            <p className="font-semibold text-blue-300">🔗 Link de convite da equipe</p>
            <p className="text-gray-400 text-sm">Compartilhe com sua equipe — ao acessar, eles são vinculados automaticamente à empresa.</p>
            <div className="flex items-center gap-3 flex-wrap">
              <code className="flex-1 font-mono text-xs text-gray-300 bg-gray-900/70 rounded-xl px-4 py-3 break-all min-w-0">
                {inviteLink}
              </code>
              <CopyInviteButton inviteLink={inviteLink} inviteCode={team.invite} />
            </div>
          </div>
        )}

        {/* Lista da equipe */}
        <div>
          <h2 className="text-xl font-bold mb-4">Equipe ({members.length})</h2>
          {members.length === 0 ? (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-12 text-center space-y-3">
              <p className="text-5xl">👥</p>
              <p className="font-semibold text-gray-300">Nenhum membro ainda</p>
              <p className="text-sm text-gray-500">Compartilhe o link acima para que sua equipe entre na plataforma.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...members].sort((a, b) => b.profile.xp - a.profile.xp).map((m, i) => {
                const diag = m.profile.diagnostics[0];
                const medal = ["🥇","🥈","🥉"][i] ?? null;
                return (
                  <div key={m.id} className={`bg-gray-900 border rounded-2xl p-4 flex items-center gap-4 flex-wrap ${i === 0 ? "border-yellow-700/50 bg-yellow-950/10" : "border-gray-800"}`}>
                    <div className="w-8 text-center flex-shrink-0">
                      {medal ? <span className="text-xl">{medal}</span> : <span className="text-gray-500 text-sm font-bold">{i + 1}</span>}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                      {m.profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{m.profile.name}</p>
                      <p className="text-xs text-gray-500 truncate">{m.profile.email}</p>
                    </div>
                    <div className="w-36 flex-shrink-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-yellow-400 font-semibold">{m.profile.xp.toLocaleString("pt-BR")} XP</span>
                        <span className="text-gray-500">Nv {m.profile.level}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                          style={{ width: `${Math.min(100, (m.profile.xp % 1000) / 10)}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {diag ? (
                        <>
                          <div className="text-center">
                            <p className={`font-bold text-lg ${diag.scoreTotal >= 70 ? "text-green-400" : diag.scoreTotal >= 40 ? "text-yellow-400" : "text-red-400"}`}>{diag.scoreTotal}</p>
                            <p className="text-xs text-gray-500">Scanner</p>
                          </div>
                          {diag.diagnosticType === "VENDEDOR" && (() => {
                            const lv = getSalesLevel(diag.scoreTotal);
                            return (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold ${lv.bg} ${lv.border} ${lv.color}`}>
                                {lv.icon} {lv.label}
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <p className="text-xs text-gray-600 leading-tight">Sem<br/>diagnóstico</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-gray-500">{new Date(m.joinedAt).toLocaleDateString("pt-BR")}</p>
                      <p className="text-xs text-gray-600">entrada</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {topMember && topMember.profile.xp > 0 && (
          <div className="bg-yellow-950/20 border border-yellow-800/50 rounded-2xl p-5 flex items-center gap-4">
            <span className="text-4xl">🏆</span>
            <div>
              <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wider">Top performer da equipe</p>
              <p className="text-xl font-bold">{topMember.profile.name}</p>
              <p className="text-sm text-gray-400">{topMember.profile.xp.toLocaleString("pt-BR")} XP • Nível {topMember.profile.level}</p>
            </div>
          </div>
        )}

      </div>
    </div>
    </ProductGate>
  );
}
