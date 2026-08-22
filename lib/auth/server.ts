import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "./session";

// Shim de compatibilidade com a API que o Clerk (@clerk/nextjs/server) expunha —
// mesmo formato de retorno, pra trocar só o import na maioria dos arquivos que
// usavam auth()/currentUser() sem precisar reescrever a lógica de cada um.

export async function auth(): Promise<{ userId: string | null }> {
  const session = await getSessionPayload();
  return { userId: session?.profileId ?? null };
}

export type ShimUser = {
  id: string;
  emailAddresses: { emailAddress: string }[];
};

export const currentUser = cache(async (): Promise<ShimUser | null> => {
  const session = await getSessionPayload();
  if (!session?.profileId) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: session.profileId },
    select: { id: true, email: true },
  });
  if (!profile) return null;
  return { id: profile.id, emailAddresses: [{ emailAddress: profile.email }] };
});
