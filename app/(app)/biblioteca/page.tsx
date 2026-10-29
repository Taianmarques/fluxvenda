import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { precosVigentes, produtosLiberados } from "@/lib/infoprodutos";
import { BibliotecaClient, type CardProduto } from "./BibliotecaClient";

// Minha Biblioteca: os infoprodutos que o usuário tem e a vitrine dos que ainda pode adquirir.
// Acesso calculado no servidor (lib/infoprodutos.ts); preço só aparece se houver oferta ativa.
export default async function BibliotecaPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const liberados = await produtosLiberados(user.id);
  const produtos = await prisma.infoProduto.findMany({
    // Rascunho só aparece pra quem já tem acesso a ele (admin), marcado como rascunho
    where: { OR: [{ publicado: true }, { id: { in: [...liberados] } }] },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    include: { modulos: { select: { _count: { select: { ferramentas: { where: { publicada: true } } } } } } },
  });
  const precos = await precosVigentes(produtos.filter(p => !liberados.has(p.id)).map(p => p.id));

  const cards: CardProduto[] = produtos.map(p => {
    const ferramentas = p.modulos.reduce((s, m) => s + m._count.ferramentas, 0);
    const preco = precos.get(p.id);
    return {
      slug: p.slug, nome: p.nome, descricao: p.descricao, beneficio: p.beneficio, capaUrl: p.capaUrl,
      categoria: p.categoria, icone: p.icone, rascunho: !p.publicado,
      ferramentas, modulos: p.modulos.filter(m => m._count.ferramentas > 0).length,
      liberado: liberados.has(p.id),
      precoCentavos: preco?.precoCentavos ?? null,
    };
  });

  return <BibliotecaClient produtos={cards} />;
}
