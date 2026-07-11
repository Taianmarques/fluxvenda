import { prisma } from "@/lib/prisma";

export type ProductName = "CRM" | "PLATAFORMA";

// CRM e Plataforma podem ser vendidos separadamente. Quem tem Team (gestor ou membro)
// herda os produtos do Team (unidade de cobrança natural, já que AgentConfig é team-scoped);
// quem não tem Team (vendedor/funcionário avulso) usa os produtos do próprio Profile.
export async function getEffectiveProducts(userId: string): Promise<Set<ProductName>> {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true, productsOwned: true } });
  if (!profile) return new Set();
  if (profile.role === "ADMIN") return new Set(["CRM", "PLATAFORMA"]);

  const ownTeam = await prisma.team.findUnique({ where: { managerId: userId }, select: { productsOwned: true } });
  if (ownTeam) return new Set(ownTeam.productsOwned as ProductName[]);

  const membership = await prisma.teamMember.findUnique({
    where: { profileId: userId },
    select: { team: { select: { productsOwned: true } } },
  });
  if (membership) return new Set(membership.team.productsOwned as ProductName[]);

  return new Set(profile.productsOwned as ProductName[]);
}

export function hasProduct(products: Set<ProductName>, product: ProductName): boolean {
  return products.has(product);
}
