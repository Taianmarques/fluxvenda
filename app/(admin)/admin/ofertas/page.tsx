import { prisma } from "@/lib/prisma";
import { OfertasAdminClient } from "./OfertasAdminClient";

export const dynamic = "force-dynamic";

// Produtos, ofertas (papel e preço de cada produto no checkout) e compras dos infoprodutos
export default async function OfertasAdminPage() {
  const [produtos, ofertas, compras] = await Promise.all([
    prisma.infoProduto.findMany({
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: {
        id: true, slug: true, nome: true, publicado: true, inclusoNaPlataforma: true, capaUrl: true, icone: true,
        _count: { select: { acessos: { where: { ativo: true } }, modulos: true } },
        modulos: { select: { _count: { select: { ferramentas: { where: { publicada: true } } } } } },
      },
    }),
    prisma.oferta.findMany({ orderBy: { createdAt: "asc" }, include: { itens: { orderBy: { ordem: "asc" } } } }),
    prisma.compra.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { itens: { include: { produto: { select: { nome: true } } } }, oferta: { select: { nome: true } } },
    }),
  ]);

  return (
    <OfertasAdminClient
      produtos={produtos.map(p => ({
        id: p.id, slug: p.slug, nome: p.nome, publicado: p.publicado, inclusoNaPlataforma: p.inclusoNaPlataforma, capaUrl: p.capaUrl, icone: p.icone,
        acessos: p._count.acessos, modulos: p._count.modulos, ferramentas: p.modulos.reduce((s, m) => s + m._count.ferramentas, 0),
      }))}
      ofertas={ofertas.map(o => ({
        id: o.id, slug: o.slug, nome: o.nome, ativa: o.ativa, sandbox: o.sandbox,
        itens: o.itens.map(i => ({ produtoId: i.produtoId, papel: i.papel as "PRINCIPAL" | "ORDER_BUMP" | "UPSELL", precoCentavos: i.precoCentavos, chamada: i.chamada, ordem: i.ordem })),
      }))}
      compras={compras.map(c => ({
        id: c.id, createdAt: c.createdAt.toISOString(), email: c.email, nome: c.nome, status: c.status, sandbox: c.sandbox,
        upsell: Boolean(c.compraOrigemId), valorCentavos: c.valorCentavos, formaPagamento: c.formaPagamento, oferta: c.oferta?.nome ?? "—",
        itens: c.itens.map(i => i.produto.nome),
      }))}
    />
  );
}
