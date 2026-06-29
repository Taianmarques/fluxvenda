"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, KanbanSquare, Calendar, Wallet, ArrowLeft } from "lucide-react";

export function CrmSidebar({ agentId }: { agentId: string }) {
  const pathname = usePathname();

  const CRM_NAV = [
    { href: `/crm/${agentId}`, label: "Mensagens", icon: MessageCircle },
    { href: `/crm/${agentId}/pipeline`, label: "Pipeline", icon: KanbanSquare },
    { href: `/crm/${agentId}/agenda`, label: "Agenda", icon: Calendar },
    { href: `/crm/${agentId}/vendas`, label: "Vendas", icon: Wallet },
  ];

  return (
    <aside className="w-56 flex-shrink-0 border-r border-gray-800 bg-black flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="font-bold text-lg">
          <span className="text-blue-400">CRM</span>
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {CRM_NAV.map(item => {
          const active = item.href === `/crm/${agentId}` ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium border-l-2 transition-colors ${
                active ? "text-white bg-blue-500/10 border-blue-500" : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon size={17} className={active ? "text-blue-400" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={17} />
          Plataforma B2B
        </Link>
      </div>
    </aside>
  );
}
