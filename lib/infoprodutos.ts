import { prisma } from "@/lib/prisma";
import { getEffectiveProducts, hasProduct } from "@/lib/products";

// Acesso aos infoprodutos (Minha Biblioteca). TODA página e API de um produto passa por aqui —
// esconder botão na interface não basta, quem digita a URL também é barrado no servidor.
//
// Um usuário acessa um produto quando:
//   - é ADMIN da plataforma; ou
//   - o produto está incluso na Plataforma B2B e a equipe/usuário tem PLATAFORMA; ou
//   - tem um AcessoProduto ativo (compra paga ou liberação manual do admin).

// Slugs que não podem ser de produto (são páginas da própria biblioteca)
export const SLUGS_RESERVADOS_BIBLIOTECA = ["meu-negocio", "favoritos", "comprar", "explorar"];

export async function produtosLiberados(userId: string): Promise<Set<string>> {
  const [profile, efetivos, acessos] = await Promise.all([
    prisma.profile.findUnique({ where: { id: userId }, select: { role: true } }),
    getEffectiveProducts(userId),
    prisma.acessoProduto.findMany({ where: { profileId: userId, ativo: true }, select: { produtoId: true } }),
  ]);
  if (profile?.role === "ADMIN") {
    return new Set((await prisma.infoProduto.findMany({ select: { id: true } })).map(p => p.id));
  }
  const ids = new Set(acessos.map(a => a.produtoId));
  if (hasProduct(efetivos, "PLATAFORMA")) {
    for (const p of await prisma.infoProduto.findMany({ where: { inclusoNaPlataforma: true }, select: { id: true } })) ids.add(p.id);
  }
  return ids;
}

export async function temAcessoAoProduto(userId: string, produtoId: string) {
  return (await produtosLiberados(userId)).has(produtoId);
}

// Acesso pela ferramenta (as APIs recebem o slug da ferramenta)
export async function temAcessoAFerramenta(userId: string, ferramenta: { modulo: { produtoId: string } }) {
  return temAcessoAoProduto(userId, ferramenta.modulo.produtoId);
}

// Preço vigente de um produto pra vitrine: o da oferta ativa em que ele é o principal (ou o menor
// entre ofertas ativas). Sem oferta ativa não há preço — a vitrine não inventa valor.
export async function precosVigentes(produtoIds: string[]) {
  const itens = await prisma.ofertaItem.findMany({
    where: { produtoId: { in: produtoIds }, oferta: { ativa: true } },
    select: { produtoId: true, precoCentavos: true, papel: true, oferta: { select: { slug: true } } },
  });
  // Preferência: oferta em que o produto é o principal (é a página onde dá pra comprá-lo sozinho);
  // entre as do mesmo tipo, o menor preço
  const porProduto = new Map<string, { precoCentavos: number; ofertaSlug: string; principal: boolean }>();
  for (const it of itens) {
    const principal = it.papel === "PRINCIPAL";
    const atual = porProduto.get(it.produtoId);
    const melhor = !atual || (principal && !atual.principal) || (principal === atual.principal && it.precoCentavos < atual.precoCentavos);
    if (melhor) porProduto.set(it.produtoId, { precoCentavos: it.precoCentavos, ofertaSlug: it.oferta.slug, principal });
  }
  return porProduto;
}

export function formatarPreco(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
