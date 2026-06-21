import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function TrilhasPage() {
  const user = await currentUser();
  const profile = await prisma.profile.findUnique({ where: { id: user!.id } });

  const trails = await prisma.trail.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    include: {
      modules: { include: { lessons: true } },
      progress: { where: { profileId: user!.id } },
    },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Trilhas de Aprendizado</h1>
        <p className="text-gray-400 mt-1">Conteúdo segmentado por funil e mercado</p>
      </div>

      {trails.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">📚</p>
          <p>Nenhuma trilha disponível ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trails.map((trail) => {
            const totalLessons = trail.modules.reduce((acc, m) => acc + m.lessons.length, 0);
            const progress = trail.progress[0];
            return (
              <Link
                key={trail.id}
                href={`/trilhas/${trail.id}`}
                className="p-5 bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{trail.title}</h3>
                  <span className="text-xs px-2 py-0.5 bg-gray-800 rounded-full text-gray-400 whitespace-nowrap">
                    {trail.funnel.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{trail.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{totalLessons} lições</span>
                  {progress?.completed ? (
                    <span className="text-green-400 font-medium">Concluída ✓</span>
                  ) : progress ? (
                    <span className="text-blue-400">Em andamento</span>
                  ) : (
                    <span>Não iniciada</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
