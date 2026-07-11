import { prisma } from "@/lib/prisma";
import { ProductGate } from "../ProductGate";

const FUNNEL_LABELS: Record<string, string> = {
  PROSPECCAO: "Prospecção",
  QUALIFICACAO: "Qualificação",
  PROPOSTA: "Proposta",
  NEGOCIACAO: "Negociação",
  FECHAMENTO: "Fechamento",
  POS_VENDA: "Pós-venda",
};

export default async function PlaybookPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;

  const items = await prisma.playbookItem.findMany({
    where: {
      published: true,
      ...(categoria ? { category: categoria as any } : {}),
    },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  const categories = Object.keys(FUNNEL_LABELS);

  return (
    <ProductGate product="PLATAFORMA">
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Playbook Interativo</h1>
        <p className="text-gray-400 mt-1">Guias, templates e melhores práticas por etapa do funil</p>
      </div>

      {/* Filtro de categorias */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/playbook"
          className={`px-4 py-2 rounded-full text-sm border transition-all ${
            !categoria
              ? "border-blue-500 bg-blue-950/40 text-blue-300"
              : "border-gray-700 text-gray-400 hover:border-gray-500"
          }`}
        >
          Todos
        </a>
        {categories.map((cat) => (
          <a
            key={cat}
            href={`/playbook?categoria=${cat}`}
            className={`px-4 py-2 rounded-full text-sm border transition-all ${
              categoria === cat
                ? "border-blue-500 bg-blue-950/40 text-blue-300"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {FUNNEL_LABELS[cat]}
          </a>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">📖</p>
          <p>Nenhum conteúdo encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{item.title}</h3>
                <span className="text-xs px-2 py-0.5 bg-gray-800 rounded-full text-gray-400 whitespace-nowrap">
                  {FUNNEL_LABELS[item.category]}
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">{item.content}</p>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-500">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </ProductGate>
  );
}
