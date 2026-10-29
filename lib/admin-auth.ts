import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

// Rotas do super admin: devolve o id do admin logado, ou null (a rota responde 403)
export async function exigirAdmin(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN" ? userId : null;
}
