import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { ProductGate } from "../ProductGate";

export default async function RankingPage() {
  const user = await currentUser();

  const profiles = await prisma.profile.findMany({
    orderBy: { xp: "desc" },
    take: 50,
    select: { id: true, name: true, xp: true, level: true, avatarUrl: true },
  });

  const myRank = profiles.findIndex((p) => p.id === user!.id) + 1;

  return (
    <ProductGate product="PLATAFORMA">
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ranking</h1>
        <p className="text-gray-400 mt-1">Os mais dedicados da plataforma</p>
        {myRank > 0 && (
          <p className="text-blue-400 text-sm mt-2">Você está em #{myRank} no ranking</p>
        )}
      </div>

      <div className="space-y-2">
        {profiles.map((profile, i) => {
          const isMe = profile.id === user!.id;
          return (
            <div
              key={profile.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                isMe
                  ? "border-blue-700 bg-blue-950/30"
                  : "border-gray-800 bg-gray-900"
              }`}
            >
              <span
                className={`text-lg font-bold w-8 text-center ${
                  i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-500"
                }`}
              >
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{profile.name} {isMe && <span className="text-blue-400 text-xs">(você)</span>}</p>
                <p className="text-xs text-gray-400">Nível {profile.level}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-400">{profile.xp.toLocaleString("pt-BR")} XP</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </ProductGate>
  );
}
