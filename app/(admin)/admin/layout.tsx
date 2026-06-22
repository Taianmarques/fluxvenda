import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true, name: true },
  });
  if (profile?.role !== "ADMIN") redirect("/dashboard");

  const NAV = [
    { href: "/admin",          label: "Dashboard", icon: "📈" },
    { href: "/admin/empresas", label: "Empresas",  icon: "🏢" },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <aside className="w-60 flex-shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <p className="font-bold text-red-400 text-lg">Super Admin</p>
          <p className="text-xs text-gray-500 mt-0.5">Plataforma B2B</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV.map((item) => (
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

        <div className="px-4 py-4 border-t border-gray-800 space-y-3">
          <Link href="/dashboard" className="block text-xs text-gray-500 hover:text-gray-300">
            ← Voltar para a plataforma
          </Link>
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile?.name ?? user.firstName}</p>
              <p className="text-xs text-gray-500 truncate">{user.emailAddresses[0]?.emailAddress}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
