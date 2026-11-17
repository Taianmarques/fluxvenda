import { currentUser } from "@/lib/auth/server";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { carregarPerfil } from "@/lib/central";
import { perfilCompleto, perfilTemEssenciais } from "@/lib/central-shared";
import { precosVigentes, temAcessoAoProduto } from "@/lib/infoprodutos";
import { carregarCurso } from "@/lib/curso";
import { CentralClient } from "./ProdutoClient";
import { CursoClient } from "./CursoClient";
import { ProdutoBloqueado } from "../ProdutoBloqueado";

// Página de um infoproduto (/biblioteca/<slug>): módulos, ferramentas, busca, filtros, favoritos.
// Produto no formato "curso" abre a área do curso (aulas, progresso e comandos; ?aula=<id> abre
// direto numa aula). O acesso é checado aqui no servidor — sem acesso, só a apresentação do produto.
export default async function ProdutoPage({ params, searchParams }: { params: Promise<{ produto: string }>; searchParams: Promise<{ aula?: string | string[] }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { produto: slug } = await params;
  const userId = user.id;

  const produto = await prisma.infoProduto.findUnique({
    where: { slug },
    include: {
      modulos: {
        orderBy: { numero: "asc" },
        include: {
          ferramentas: {
            where: { publicada: true },
            orderBy: [{ ordem: "asc" }, { nome: "asc" }],
            select: { id: true, slug: true, nome: true, descricao: true, icone: true, ordem: true, createdAt: true },
          },
          _count: { select: { aulas: { where: { publicada: true } } } },
        },
      },
    },
  });
  if (!produto) notFound();

  const acesso = await temAcessoAoProduto(userId, produto.id);
  // Rascunho só existe pra quem já tem acesso (admin); pros demais é como se não existisse
  if (!produto.publicado && !acesso) notFound();

  const curso = produto.formato === "curso";
  if (!acesso) {
    const preco = (await precosVigentes([produto.id])).get(produto.id) ?? null;
    const porModulo = produto.modulos
      .map(m => ({ nome: m.nome, total: curso ? m._count.aulas : m.ferramentas.length }))
      .filter(m => m.total > 0);
    return (
      <ProdutoBloqueado
        produto={produto}
        modulos={porModulo}
        totalItens={porModulo.reduce((s, m) => s + m.total, 0)}
        rotuloItens={curso ? "aulas" : "ferramentas"}
        preco={preco}
      />
    );
  }

  if (curso) {
    const [{ modulos, concluidas }, sp] = await Promise.all([carregarCurso(produto.id, userId), searchParams]);
    return (
      <CursoClient
        produto={{ nome: produto.nome, beneficio: produto.beneficio }}
        modulos={modulos}
        concluidasIniciais={concluidas}
        aulaInicial={typeof sp.aula === "string" ? sp.aula : null}
      />
    );
  }

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const ferramentaIds = produto.modulos.flatMap(m => m.ferramentas.map(f => f.id));
  const doProduto = { profileId: userId, tipo: "prompt", ferramentaId: { in: ferramentaIds } };

  const [favoritos, perfil, profile, geracoesMes, salvos] = await Promise.all([
    prisma.centralFavorito.findMany({ where: { profileId: userId, ferramentaId: { in: ferramentaIds } }, select: { ferramenta: { select: { slug: true } } } }),
    carregarPerfil(userId),
    prisma.profile.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.centralGeracao.count({ where: { ...doProduto, createdAt: { gte: inicioMes } } }),
    prisma.centralGeracao.count({ where: { ...doProduto, salvo: true } }),
  ]);

  return (
    <CentralClient
      produto={{ slug: produto.slug, nome: produto.nome, beneficio: produto.beneficio, descricao: produto.descricao }}
      modulos={produto.modulos.map(m => ({
        id: m.id, numero: m.numero, nome: m.nome, descricao: m.descricao, icone: m.icone,
        ferramentas: m.ferramentas.map(f => ({ slug: f.slug, nome: f.nome, descricao: f.descricao, icone: f.icone, ordem: f.ordem, criadaEm: f.createdAt.toISOString() })),
      }))}
      favoritosIniciais={favoritos.map(f => f.ferramenta.slug)}
      perfilPct={perfilCompleto(perfil)}
      perfilOk={perfilTemEssenciais(perfil)}
      primeiroNome={(profile?.name ?? "").trim().split(/\s+/)[0] ?? ""}
      geracoesMes={geracoesMes}
      salvos={salvos}
    />
  );
}
