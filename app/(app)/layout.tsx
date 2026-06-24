import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
    { href: "/whatsapp",    label: "WhatsApp",    icon: "🟢", show: isGestor },
    { href: "/agenda",      label: "Agenda",      icon: "📅", show: isGestor },
    { href: "/ferramentas", label: "Ferramentas", icon: "🧰", show: isGestor },
    { href: "/admin",       label: "Super Admin", icon: "🛠️", show: isAdmin },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <p className="font-bold text-blue-400 text-lg">Plataforma B2B</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV.filter(i => i.show).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-800 flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{profile.name ?? user.firstName}</p>
            <p className="text-xs text-gray-500 truncate">{user.emailAddresses[0]?.emailAddress}</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
