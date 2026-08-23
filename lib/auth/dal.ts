import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionPayload, deleteSession } from "./session";

// Checagem "otimista" (só o cookie, sem ir no banco) — pra layouts/pages que só
// precisam saber se tem alguém logado e qual o profileId/role.
export const verifySession = cache(async () => {
  const session = await getSessionPayload();
  if (!session?.profileId) redirect("/sign-in");
  return session;
});

// Igual acima mas não redireciona — usado em rotas públicas (ex: /api/auth/me)
// que precisam saber se tem sessão sem forçar login.
export const getOptionalSession = cache(async () => {
  return getSessionPayload();
});

// Checagem "segura" — busca o Profile completo no banco. É a fonte da verdade
// pra autorização real (role, onboarded, etc), igual o projeto já fazia hoje
// preferindo o banco aos claims do JWT do Clerk.
export const getCurrentProfile = cache(async () => {
  const session = await verifySession();
  const profile = await prisma.profile.findUnique({ where: { id: session.profileId } });
  if (!profile) redirect("/sign-in");

  // Membro desativado pelo gestor — derruba a sessão na hora, sem esperar expirar.
  const membership = await prisma.teamMember.findUnique({ where: { profileId: profile.id }, select: { active: true } });
  if (membership && !membership.active) {
    await deleteSession();
    redirect("/sign-in");
  }

  return profile;
});
