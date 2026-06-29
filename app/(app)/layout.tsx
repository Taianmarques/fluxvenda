import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "./AppSidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Verifica onboarding pelo DB (não depende de Clerk JWT claims desatualizados)
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { onboarded: true, role: true, name: true },
  });
  if (!profile?.onboarded) redirect("/onboarding");

  const isGestor = profile.role === "GESTOR" || profile.role === "ADMIN";
  const isAdmin = profile.role === "ADMIN";

  // Atendentes (membros de equipe, qualquer role) também acessam o CRM do número da equipe
  const isTeamMember = isGestor || Boolean(await prisma.teamMember.findUnique({ where: { profileId: user.id } }));

  const NAV = [
    { href: "/dashboard",  label: "Dashboard",  icon: "dashboard" as const, show: true },
    { href: "/scanner",    label: "Scanner",    icon: "scanner" as const, show: true },
    { href: "/missoes",    label: "Plano de Ação", icon: "missoes" as const, show: true },
    { href: "/simulacao",  label: "Simulação",  icon: "simulacao" as const, show: true },
    { href: "/trilhas",    label: "Trilhas",    icon: "trilhas" as const, show: true },
    { href: "/objecoes",   label: "Objeções",   icon: "objecoes" as const, show: true },
    { href: "/scripts",    label: "Scripts",    icon: "scripts" as const, show: true },
    { href: "/playbook",   label: "Playbook",   icon: "playbook" as const, show: true },
    { href: "/ranking",    label: "Ranking",    icon: "ranking" as const, show: true },
    { href: "/gestor",      label: "Equipe",      icon: "equipe" as const, show: isGestor },
    { href: "/crm",         label: "CRM",         icon: "crm" as const, show: isTeamMember },
    { href: "/ferramentas", label: "Ferramentas", icon: "ferramentas" as const, show: isGestor },
    { href: "/admin",       label: "Super Admin", icon: "admin" as const, show: isAdmin },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <AppSidebar nav={NAV} profileName={profile.name ?? user.firstName ?? ""} email={user.emailAddresses[0]?.emailAddress ?? ""} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
