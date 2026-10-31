import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { produtosLiberados } from "@/lib/infoprodutos";
import { FavoritosClient } from "./FavoritosClient";

// Ferramentas favoritas de todos os produtos (a estrela fica no card e na tela de cada ferramenta).
// Só aparecem as publicadas de produtos que a pessoa tem liberados.
export default async function FavoritosPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const [favoritos, liberados] = await Promise.all([
    prisma.centralFavorito.findMany({
      where: { profileId: user.id, ferramenta: { publicada: true } },
      orderBy: { createdAt: "desc" },
      select: {
        ferramenta: {
          select: {
            slug: true, nome: true, descricao: true, icone: true,
            modulo: { select: { id: true, nome: true, produto: { select: { id: true, slug: true, nome: true } } } },
          },
        },
      },
    }),
    produtosLiberados(user.id),
  ]);
  if (liberados.size === 0) redirect("/biblioteca");

  return (
    <FavoritosClient
      inicial={favoritos
        .filter(f => liberados.has(f.ferramenta.modulo.produto.id))
        .map(({ ferramenta: f }) => ({
          slug: f.slug, nome: f.nome, descricao: f.descricao, icone: f.icone,
          moduloId: f.modulo.id, moduloNome: f.modulo.nome, produtoSlug: f.modulo.produto.slug, produtoNome: f.modulo.produto.nome,
        }))}
    />
  );
}
