import { prisma } from "@/lib/prisma";

export type ProductName = "CRM" | "PLATAFORMA";

// CRM e Plataforma podem ser vendidos separadamente. Quem tem Team (gestor ou membro)
// herda os produtos do Team (unidade de cobrança natural, já que AgentConfig é team-scoped);
// quem não tem Team (vendedor/funcionário avulso) usa os produtos do próprio Profile.
export async function getEffectiveProducts(userId: string): Promise<Set<ProductName>> {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true, productsOwned: true } });
  if (!profile) return new Set();
  if (profile.role === "ADMIN") return new Set(["CRM", "PLATAFORMA"]);

  const ownTeam = await prisma.team.findUnique({ where: { managerId: userId }, select: { productsOwned: true, crmTrialEndsAt: true } });
  if (ownTeam) return applyTrialExpiry(ownTeam.productsOwned as ProductName[], ownTeam.crmTrialEndsAt);

  const membership = await prisma.teamMember.findUnique({
    where: { profileId: userId },
    select: { team: { select: { productsOwned: true, crmTrialEndsAt: true } } },
  });
  if (membership) return applyTrialExpiry(membership.team.productsOwned as ProductName[], membership.team.crmTrialEndsAt);

  return new Set(profile.productsOwned as ProductName[]);
}

// Trial vencido remove CRM do conjunto efetivo mesmo que ainda conste em productsOwned —
// evita precisar de um cron pra "revogar" o acesso, o corte acontece na leitura.
function applyTrialExpiry(productsOwned: ProductName[], crmTrialEndsAt: Date | null): Set<ProductName> {
  const products = new Set(productsOwned);
  if (crmTrialEndsAt && crmTrialEndsAt.getTime() < Date.now()) products.delete("CRM");
  return products;
}

export function hasProduct(products: Set<ProductName>, product: ProductName): boolean {
  return products.has(product);
}

export type CrmTrialStatus = { active: boolean; expired: boolean; endsAt: Date; daysLeft: number } | null;

// Status do trial de CRM da equipe do usuário — usado pra mostrar a contagem regressiva
// (ou aviso de expirado) no CRM/Ferramentas. null = time nunca teve trial (CRM pago ou nunca contratado).
export async function getCrmTrialStatus(userId: string): Promise<CrmTrialStatus> {
  const ownTeam = await prisma.team.findUnique({ where: { managerId: userId }, select: { crmTrialEndsAt: true } });
  const endsAt = ownTeam
    ? ownTeam.crmTrialEndsAt
    : (await prisma.teamMember.findUnique({ where: { profileId: userId }, select: { team: { select: { crmTrialEndsAt: true } } } }))?.team.crmTrialEndsAt;

  if (!endsAt) return null;
  const msLeft = endsAt.getTime() - Date.now();
  return { active: msLeft > 0, expired: msLeft <= 0, endsAt, daysLeft: Math.max(0, Math.ceil(msLeft / 86_400_000)) };
}
