import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { carregarPerfil } from "@/lib/central";
import { perfilTemEssenciais } from "@/lib/central-shared";
import { precosVigentes, produtosLiberados } from "@/lib/infoprodutos";
import { recomendarFerramentas, ultimoDiagnostico } from "@/lib/diagnostico-recomendacoes";
import { InicioClient, type FerramentaInicio, type ProdutoInicio, type PassoInicio } from "./InicioClient";

export const dynamic = "force-dynamic";

// Início: boas-vindas, números do usuário, produtos, próximos passos, ferramentas em destaque e
// vitrine de kits. Tudo calculado com dados reais — nada de número inventado.
export default async function InicioPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const userId = user.id;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [liberados, profile, perfil, diagnostico] = await Promise.all([
    produtosLiberados(userId),
    prisma.profile.findUnique({ where: { id: userId }, select: { name: true } }),
    carregarPerfil(userId),
    ultimoDiagnostico(userId),
  ]);
  const idsLiberados = [...liberados];

  const [produtos, ferramentas, salvos, preparados, preparadosMes, usadas, favoritas, maisUsadas] = await Promise.all([
    prisma.infoProduto.findMany({
      where: { OR: [{ publicado: true }, { id: { in: idsLiberados } }] },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, slug: true, nome: true, descricao: true, beneficio: true, capaUrl: true, icone: true },
    }),
    prisma.centralFerramenta.findMany({
      where: { publicada: true, modulo: { produtoId: { in: idsLiberados } } },
      orderBy: [{ modulo: { numero: "asc" } }, { ordem: "asc" }, { nome: "asc" }],
      select: { id: true, slug: true, nome: true, descricao: true, icone: true, moduloId: true, modulo: { select: { produto: { select: { slug: true, nome: true } } } } },
    }),
    prisma.centralGeracao.count({ where: { profileId: userId, tipo: "prompt", salvo: true } }),
    prisma.centralGeracao.count({ where: { profileId: userId, tipo: "prompt" } }),
    prisma.centralGeracao.count({ where: { profileId: userId, tipo: "prompt", createdAt: { gte: inicioMes } } }),
    prisma.centralGeracao.findMany({ where: { profileId: userId, tipo: "prompt" }, distinct: ["ferramentaId"], select: { ferramentaId: true } }),
    prisma.centralFavorito.findMany({ where: { profileId: userId }, orderBy: { createdAt: "desc" }, select: { ferramentaId: true } }),
    prisma.centralGeracao.groupBy({ by: ["ferramentaId"], where: { tipo: "prompt" }, _count: { _all: true }, orderBy: { _count: { ferramentaId: "desc" } }, take: 30 }),
  ]);

  const lista: FerramentaInicio[] = ferramentas.map(f => ({
    id: f.id, slug: f.slug, nome: f.nome, descricao: f.descricao, icone: f.icone, moduloId: f.moduloId,
    produtoSlug: f.modulo.produto.slug, produtoNome: f.modulo.produto.nome,
  }));
  const porId = new Map(lista.map(f => [f.id, f]));

  // Destaque: as favoritas do usuário, depois as mais usadas na plataforma, depois a ordem do catálogo
  const destaque: FerramentaInicio[] = [];
  for (const id of [...favoritas.map(f => f.ferramentaId), ...maisUsadas.map(m => m.ferramentaId), ...lista.map(f => f.id)]) {
    const f = porId.get(id);
    if (f && !destaque.includes(f)) destaque.push(f);
    if (destaque.length === 6) break;
  }

  // Próximos passos: sem diagnóstico, o primeiro passo é fazê-lo (é gratuito); com diagnóstico, uma
  // ferramenta recomendada por área fraca. Depois: completar o perfil (se faltar o essencial) e
  // ferramentas que a pessoa ainda não usou, uma por módulo, pra variar
  const jaUsou = new Set(usadas.map(u => u.ferramentaId));
  const slugsUsados = new Set(lista.filter(f => jaUsou.has(f.id)).map(f => f.slug));
  const passos: PassoInicio[] = [];
  if (!diagnostico) {
    passos.push({ tipo: "diagnostico", titulo: "Faça seu diagnóstico comercial", descricao: "Gratuito: descubra o que trava suas vendas e por onde começar.", href: "/scanner/novo", icone: "compass", moduloId: "" });
  } else {
    for (const area of await recomendarFerramentas(userId, diagnostico)) {
      const f = area.ferramentas.find(x => !slugsUsados.has(x.slug));
      if (!f || passos.length === 2) continue;
      passos.push({
        tipo: "ferramenta", titulo: f.nome, descricao: `Para melhorar ${area.label} (nota ${area.score} no diagnóstico).`,
        href: f.liberado ? `/biblioteca/${f.produtoSlug}/${f.slug}` : `/biblioteca/${f.produtoSlug}`, icone: f.icone, moduloId: f.moduloId,
      });
    }
  }
  if (liberados.size > 0 && !perfilTemEssenciais(perfil)) {
    passos.push({ tipo: "perfil", titulo: "Complete o perfil da empresa", descricao: "Seus prompts saem prontos com os dados do seu negócio.", href: "/biblioteca/meu-negocio", icone: "store", moduloId: "" });
  }
  const modulosVistos = new Set<string>();
  for (const f of lista) {
    if (passos.length === 3) break;
    if (jaUsou.has(f.id) || modulosVistos.has(f.moduloId) || passos.some(p => p.href.endsWith(`/${f.slug}`))) continue;
    modulosVistos.add(f.moduloId);
    passos.push({ tipo: "ferramenta", titulo: f.nome, descricao: f.descricao, href: `/biblioteca/${f.produtoSlug}/${f.slug}`, icone: f.icone, moduloId: f.moduloId });
  }

  const contagem = new Map<string, number>();
  for (const f of ferramentas) contagem.set(f.modulo.produto.slug, (contagem.get(f.modulo.produto.slug) ?? 0) + 1);
  const precos = await precosVigentes(produtos.filter(p => !liberados.has(p.id)).map(p => p.id));
  const cards: ProdutoInicio[] = produtos.map(p => ({
    slug: p.slug, nome: p.nome, descricao: p.descricao || p.beneficio, capaUrl: p.capaUrl, icone: p.icone,
    liberado: liberados.has(p.id), ferramentas: contagem.get(p.slug) ?? 0,
    precoCentavos: precos.get(p.id)?.precoCentavos ?? null,
  }));

  return (
    <InicioClient
      nome={profile?.name ?? ""}
      empresa={perfil.nomeEmpresa}
      produtos={cards}
      ferramentas={lista}
      destaque={destaque}
      passos={passos}
      numeros={{ produtos: liberados.size, ferramentas: lista.length, modulos: new Set(lista.map(f => f.moduloId)).size, salvos, preparados, preparadosMes }}
    />
  );
}
