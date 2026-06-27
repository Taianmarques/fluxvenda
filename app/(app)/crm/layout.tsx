"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CRM_NAV = [
  { href: "/crm", label: "Mensagens", icon: "💬" },
  { href: "/crm/agenda", label: "Agenda", icon: "📅" },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="h-full flex bg-gray-950">
      <aside className="w-56 flex-shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <p className="font-bold text-blue-400 text-lg">CRM</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {CRM_NAV.map(item => {
            const active = item.href === "/crm" ? pathname === "/crm" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "text-white bg-gray-800" : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <span className="text-base">←</span>
            Plataforma B2B
          </Link>
        </div>
      </aside>

      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
