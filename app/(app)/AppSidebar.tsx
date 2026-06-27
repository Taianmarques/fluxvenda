"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

type NavItem = { href: string; label: string; icon: string; show: boolean };

export function AppSidebar({
  nav, profileName, email,
}: {
  nav: NavItem[];
  profileName: string;
  email: string;
}) {
  const pathname = usePathname();

  // Dentro do CRM, o sidebar próprio do CRM ocupa esse espaço — evita dois menus lado a lado.
  if (pathname.startsWith("/crm")) return null;

  return (
    <aside className="w-60 flex-shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="font-bold text-blue-400 text-lg">Plataforma B2B</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {nav.filter(i => i.show).map((item) => (
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
          <p className="text-sm font-medium truncate">{profileName}</p>
          <p className="text-xs text-gray-500 truncate">{email}</p>
        </div>
      </div>
    </aside>
  );
}
