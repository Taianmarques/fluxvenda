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

// Perfil de acesso pode restringir um atendente a só ver conversas já atribuídas a ele mesmo,
// escondendo leads novos ainda sem dono. true = vê tudo (padrão hoje); chamado só nos pontos
// que já checam isManager antes (gestor/coManager nunca passam por aqui — sempre veem tudo).
export async function podeVerNaoAtribuidos(userId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: { profileId: userId },
    include: { accessProfile: true },
  });
  if (!membership?.accessProfile) return true;
  return membership.accessProfile.verNaoAtribuidos;
}
