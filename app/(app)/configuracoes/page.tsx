import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { urlMcp } from "@/lib/mcp/oauth";
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
  const tokens = await prisma.mcpToken.findMany({
    where: { profileId: user.id, revokedAt: null, refreshExpiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, lastUsedAt: true, client: { select: { nome: true } } },
  });
  const quando = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const conexoes = tokens.map(t => ({ id: t.id, nome: t.client.nome, criadaEm: quando(t.createdAt), ultimoUso: t.lastUsedAt ? quando(t.lastUsedAt) : null }));
  return <ConfiguracoesClient nome={profile.name} email={profile.email} telefone={profile.phone ?? ""} temSenha={Boolean(profile.passwordHash)} urlConector={urlMcp()} conexoes={conexoes} />;
}
