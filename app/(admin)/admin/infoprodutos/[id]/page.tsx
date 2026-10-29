import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProdutoEditorClient } from "./ProdutoEditorClient";

export const dynamic = "force-dynamic";

// Editor de um infoproduto: dados, capa, configurações, módulos e quem tem acesso
export default async function ProdutoEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const produto = await prisma.infoProduto.findUnique({
    where: { id },
    include: {
      modulos: { orderBy: { numero: "asc" }, include: { _count: { select: { ferramentas: true } } } },
      acessos: { orderBy: { createdAt: "desc" }, take: 500, include: { compra: { select: { id: true, status: true, sandbox: true, valorCentavos: true } } } },
    },
  });
  if (!produto) notFound();

  const perfis = await prisma.profile.findMany({
    where: { id: { in: [...new Set(produto.acessos.map(a => a.profileId))] } },
    select: { id: true, name: true, email: true },
  });
  const perfil = new Map(perfis.map(p => [p.id, p]));

  return (
    <ProdutoEditorClient
      produto={{
        id: produto.id, slug: produto.slug, nome: produto.nome, descricao: produto.descricao, beneficio: produto.beneficio,
        categoria: produto.categoria, icone: produto.icone, capaUrl: produto.capaUrl, ordem: produto.ordem, publicado: produto.publicado,
        precoReferenciaCentavos: produto.precoReferenciaCentavos, inclusoNaPlataforma: produto.inclusoNaPlataforma,
        regrasQualidade: produto.regrasQualidade, anexoNecessario: produto.anexoNecessario ?? "", checkoutRef: produto.checkoutRef ?? "",
      }}
      modulos={produto.modulos.map(m => ({ id: m.id, numero: m.numero, nome: m.nome, descricao: m.descricao, icone: m.icone, ferramentas: m._count.ferramentas }))}
      acessos={produto.acessos.map(a => ({
        id: a.id, createdAt: a.createdAt.toISOString(), origem: a.origem, ativo: a.ativo, motivo: a.motivo,
        nome: perfil.get(a.profileId)?.name ?? "—", email: perfil.get(a.profileId)?.email ?? "(conta removida)",
        compra: a.compra ? { status: a.compra.status, sandbox: a.compra.sandbox, valorCentavos: a.compra.valorCentavos } : null,
      }))}
    />
  );
}
