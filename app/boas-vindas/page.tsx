import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { carregarPerfil, podeUsarCentral } from "@/lib/central";
import { BoasVindasClient } from "./BoasVindasClient";

export const metadata: Metadata = { title: "Boas-vindas · Vendas IA", robots: { index: false } };
export const dynamic = "force-dynamic";

// Primeiro acesso: perfil da empresa em perguntas, uma por tela (a página de acesso da compra
// manda pra cá depois que a pessoa cria a senha). Grava no mesmo PerfilEmpresa da "Minha Empresa",
// que preenche os formulários de todas as ferramentas. Fora do layout com menu, em tela cheia.
export default async function BoasVindasPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/boas-vindas");
  if (!(await podeUsarCentral(user.id))) redirect("/inicio");

  const [perfil, profile] = await Promise.all([
    carregarPerfil(user.id),
    prisma.profile.findUnique({ where: { id: user.id }, select: { name: true } }),
  ]);
  const primeiroNome = (profile?.name ?? "").trim().split(/\s+/)[0] ?? "";
  return <BoasVindasClient inicial={perfil} nome={primeiroNome} />;
}
