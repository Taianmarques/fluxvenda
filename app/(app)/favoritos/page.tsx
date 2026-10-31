import Link from "next/link";
import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { MessageSquareText, Star, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { produtosLiberados } from "@/lib/infoprodutos";
import { FavoritosClient } from "./FavoritosClient";
import { SalvosClient } from "./SalvosClient";

// Favoritos em um lugar só, em duas abas:
//   Ferramentas — as que a pessoa marcou com a estrela (só publicadas de produtos liberados);
//   Prompts     — os prompts que ela favoritou (inclusive de produto sem acesso: foi ela quem
//                 preparou; "Reutilizar" só aparece para os produtos liberados).
// /biblioteca/favoritos (antigo "Meus Prompts") redireciona para a aba Prompts.
export default async function FavoritosPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const liberados = await produtosLiberados(user.id);
  if (liberados.size === 0) redirect("/biblioteca");

  const aba = (await searchParams).aba === "prompts" ? "prompts" : "ferramentas";
  const [ferramentas, prompts] = await Promise.all([
    prisma.centralFavorito.findMany({
      where: { profileId: user.id, ferramenta: { publicada: true } },
      orderBy: { createdAt: "desc" },
      select: {
        ferramenta: {
          select: {
            slug: true, nome: true, descricao: true, icone: true,
            modulo: { select: { id: true, nome: true, produto: { select: { id: true, slug: true } } } },
          },
        },
      },
    }),
    prisma.centralGeracao.findMany({
      where: { profileId: user.id, tipo: "prompt", salvo: true },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, resultado: true, createdAt: true, entradas: true,
        ferramenta: { select: { slug: true, nome: true, icone: true, moduloId: true, publicada: true, modulo: { select: { produto: { select: { id: true, slug: true } } } } } },
      },
    }),
  ]);
  const favoritas = ferramentas.filter(f => liberados.has(f.ferramenta.modulo.produto.id));

  const abas = [
    { id: "ferramentas", rotulo: "Ferramentas", n: favoritas.length, icone: Wrench },
    { id: "prompts", rotulo: "Prompts", n: prompts.length, icone: MessageSquareText },
  ];

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Star size={22} className="fill-amber-400 text-amber-400" /> Favoritos</h1>
          <p className="text-slate-500 mt-1">
            {aba === "ferramentas" ? "As ferramentas que você marcou com a estrela, de todos os seus produtos." : "Os prompts que você favoritou, prontos para copiar de novo ou reutilizar com outros dados."}
          </p>
        </header>

        <nav aria-label="Tipo de favorito" className="flex gap-2 border-b border-slate-200">
          {abas.map(a => {
            const ativa = a.id === aba;
            const Icone = a.icone;
            return (
              <Link
                key={a.id} href={a.id === "prompts" ? "/favoritos?aba=prompts" : "/favoritos"} aria-current={ativa ? "page" : undefined}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${ativa ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                <Icone size={15} /> {a.rotulo}
                <span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${ativa ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"}`}>{a.n}</span>
              </Link>
            );
          })}
        </nav>

        {aba === "ferramentas" ? (
          <FavoritosClient
            inicial={favoritas.map(({ ferramenta: f }) => ({
              slug: f.slug, nome: f.nome, descricao: f.descricao, icone: f.icone,
              moduloId: f.modulo.id, moduloNome: f.modulo.nome, produtoSlug: f.modulo.produto.slug,
            }))}
          />
        ) : (
          <SalvosClient
            inicial={prompts.map(s => ({
              id: s.id, prompt: s.resultado, createdAt: s.createdAt.toISOString(),
              entradas: (s.entradas ?? {}) as Record<string, string>,
              ferramenta: {
                slug: s.ferramenta.slug, nome: s.ferramenta.nome, icone: s.ferramenta.icone, moduloId: s.ferramenta.moduloId,
                produtoSlug: s.ferramenta.modulo.produto.slug,
                publicada: s.ferramenta.publicada && liberados.has(s.ferramenta.modulo.produto.id),
              },
            }))}
          />
        )}
      </div>
    </div>
  );
}
