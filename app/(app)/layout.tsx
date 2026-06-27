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
    { href: "/dashboard",  label: "Dashboard",  icon: "🏠", show: true },
    { href: "/scanner",    label: "Scanner",    icon: "📊", show: true },
    { href: "/missoes",    label: "Plano de Ação", icon: "🎯", show: true },
    { href: "/simulacao",  label: "Simulação",  icon: "🎮", show: true },
    { href: "/trilhas",    label: "Trilhas",    icon: "📚", show: true },
    { href: "/objecoes",   label: "Objeções",   icon: "💬", show: true },
    { href: "/scripts",    label: "Scripts",    icon: "✍️", show: true },
    { href: "/playbook",   label: "Playbook",   icon: "📖", show: true },
    { href: "/ranking",    label: "Ranking",    icon: "🏆", show: true },
    { href: "/gestor",      label: "Equipe",      icon: "👥", show: isGestor },
    { href: "/crm",         label: "CRM",         icon: "🟢", show: isTeamMember },
    { href: "/ferramentas", label: "Ferramentas", icon: "🧰", show: isGestor },
    { href: "/admin",       label: "Super Admin", icon: "🛠️", show: isAdmin },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <AppSidebar nav={NAV} profileName={profile.name ?? user.firstName ?? ""} email={user.emailAddresses[0]?.emailAddress ?? ""} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
