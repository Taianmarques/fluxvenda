import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OnboardingFlow } from "../OnboardingFlow";

// Onboarding do convidado que entrou numa equipe pelo link (/entrar/[code]) — mínimo,
// sem escolha de papel/produtos: ele herda o contexto da equipe. Equipe só de CRM
// termina direto no CRM; equipe com Plataforma termina no dashboard.
export default async function OnboardingMembroPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const membership = await prisma.teamMember.findUnique({
    where: { profileId: user.id },
    include: { team: { select: { name: true, productsOwned: true } } },
  });
  // Sem equipe não é membro convidado — segue o onboarding normal
  if (!membership) redirect("/onboarding");

  const crmOnly = membership.team.productsOwned.includes("CRM") && !membership.team.productsOwned.includes("PLATAFORMA");

  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { onboarded: true } });
  if (profile?.onboarded) redirect(crmOnly ? "/crm" : "/dashboard");

  return (
    <OnboardingFlow
      variant="membro"
      teamName={membership.team.name}
      memberDestino={crmOnly ? "/crm" : "/dashboard"}
      memberRole={crmOnly ? "FUNCIONARIO" : "VENDEDOR"}
    />
  );
}
