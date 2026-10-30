import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ConfiguracoesClient } from "./ConfiguracoesClient";

// Configurações da conta: dados pessoais e senha
export default async function ConfiguracoesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, phone: true, passwordHash: true },
  });
  if (!profile) redirect("/sign-in");
  return <ConfiguracoesClient nome={profile.name} email={profile.email} telefone={profile.phone ?? ""} temSenha={Boolean(profile.passwordHash)} />;
}
