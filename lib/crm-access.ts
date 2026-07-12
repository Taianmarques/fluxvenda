import { prisma } from "@/lib/prisma";
import { type CrmPageKey } from "@/lib/crm-nav-config";

// null = acesso total (gestor da equipe, ou membro sem perfil de acesso atribuído —
// comportamento padrão de hoje, ninguém perde acesso ao ligar essa feature)
export async function getCrmAllowedPages(userId: string): Promise<CrmPageKey[] | null> {
  const ownTeam = await prisma.team.findUnique({ where: { managerId: userId } });
  if (ownTeam) return null;

  const membership = await prisma.teamMember.findUnique({
    where: { profileId: userId },
    include: { accessProfile: true },
  });
  if (!membership?.accessProfile) return null;
  return membership.accessProfile.allowedPages as CrmPageKey[];
}

export async function hasCrmPageAccess(userId: string, pageKey: CrmPageKey): Promise<boolean> {
  const allowed = await getCrmAllowedPages(userId);
  return allowed === null || allowed.includes(pageKey);
}
