"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/crm", label: "💬 Mensagens" },
  { href: "/crm/agenda", label: "📅 Agenda" },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="border-b border-gray-800 px-6 pt-4 flex-shrink-0">
        <nav className="flex gap-1">
          {TABS.map(tab => {
            const active = tab.href === "/crm" ? pathname === "/crm" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`text-sm font-medium px-4 py-2.5 rounded-t-lg border-b-2 transition-colors ${
                  active ? "text-white border-blue-500 bg-gray-900" : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
