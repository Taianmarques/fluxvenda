import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "./AppSidebar";
import { OneSignalInit } from "./OneSignalInit";
import { getEffectiveProducts, hasProduct } from "@/lib/products";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Verifica onboarding pelo DB (não depende de Clerk JWT claims desatualizados)
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { onboarded: true, role: true, name: true },
  });
  if (!profile?.onboarded) {
    // Quem já entrou numa equipe pelo convite faz o onboarding mínimo de membro
    const membership = await prisma.teamMember.findUnique({ where: { profileId: user.id }, select: { id: true } });
    redirect(membership ? "/onboarding/membro" : "/onboarding");
  }

  const isGestor = profile.role === "GESTOR" || profile.role === "ADMIN";
  const isAdmin = profile.role === "ADMIN";

  // Atendentes (membros de equipe, qualquer role) também acessam o CRM do número da equipe
  const isTeamMember = isGestor || Boolean(await prisma.teamMember.findUnique({ where: { profileId: user.id } }));

  // CRM e Plataforma podem ser vendidos separadamente — item de menu de um produto não
  // contratado continua visível, só fica com cadeado (ver AppSidebar + ProductGate)
  const products = await getEffectiveProducts(user.id);
  const hasCrm = hasProduct(products, "CRM");
  const hasPlataforma = hasProduct(products, "PLATAFORMA");

  // Quem não contratou a Plataforma não precisa ver os 9 itens individuais bloqueados —
  // colapsa tudo num único link de upsell (último do menu) que leva direto pra landing do produto.
  const NAV = [
    { href: "/dashboard",  label: "Dashboard",  icon: "dashboard" as const, show: true, locked: false },
    ...(hasPlataforma ? [
      { href: "/scanner",    label: "Scanner",    icon: "scanner" as const, show: true, locked: false },
      { href: "/missoes",    label: "Plano de Ação", icon: "missoes" as const, show: true, locked: false },
      { href: "/simulacao",  label: "Simulação",  icon: "simulacao" as const, show: true, locked: false },
      { href: "/trilhas",    label: "Trilhas",    icon: "trilhas" as const, show: true, locked: false },
      { href: "/objecoes",   label: "Objeções",   icon: "objecoes" as const, show: true, locked: false },
      { href: "/scripts",    label: "Scripts",    icon: "scripts" as const, show: true, locked: false },
      { href: "/playbook",   label: "Playbook",   icon: "playbook" as const, show: true, locked: false },
      { href: "/ranking",    label: "Ranking",    icon: "ranking" as const, show: true, locked: false },
      { href: "/gestor",     label: "Equipe",     icon: "equipe" as const, show: isGestor, locked: false },
    ] : []),
    { href: "/crm",         label: "CRM",         icon: "crm" as const, show: isTeamMember, locked: !hasCrm },
    { href: "/creditos",    label: "Créditos de IA", icon: "creditos" as const, show: isGestor, locked: false },
    { href: "/ferramentas", label: "Ferramentas", icon: "ferramentas" as const, show: isGestor, locked: !hasCrm },
    { href: "/admin",       label: "Super Admin", icon: "admin" as const, show: isAdmin, locked: false },
    ...(hasPlataforma ? [] : [
      { href: "/produtos/plataforma", label: "Plataforma B2B", icon: "plataforma" as const, show: true, locked: true },
    ]),
  ];

  return (
    <div className="flex flex-col md:flex-row h-dvh bg-gray-950 text-white overflow-hidden">
      <OneSignalInit userId={user.id} />
      <AppSidebar nav={NAV} profileName={profile.name ?? user.firstName ?? ""} email={user.emailAddresses[0]?.emailAddress ?? ""} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
