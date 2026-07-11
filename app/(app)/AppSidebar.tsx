"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import {
  LayoutDashboard, ScanSearch, Target, Gamepad2, BookOpen, MessageSquare,
  PenTool, BookText, Trophy, Users, Headset, Wrench, ShieldCheck, Menu, X, Coins, Lock, GraduationCap,
} from "lucide-react";

const ICONS = {
  dashboard: LayoutDashboard,
  scanner: ScanSearch,
  missoes: Target,
  simulacao: Gamepad2,
  trilhas: BookOpen,
  objecoes: MessageSquare,
  scripts: PenTool,
  playbook: BookText,
  ranking: Trophy,
  equipe: Users,
  crm: Headset,
  ferramentas: Wrench,
  admin: ShieldCheck,
  creditos: Coins,
  plataforma: GraduationCap,
};

type NavItem = { href: string; label: string; icon: keyof typeof ICONS; show: boolean; locked: boolean };

export function AppSidebar({
  nav, profileName, email,
}: {
  nav: NavItem[];
  profileName: string;
  email: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Dentro do CRM, o sidebar próprio do CRM ocupa esse espaço — evita dois menus lado a lado.
  if (pathname.startsWith("/crm")) return null;

  return (
    <>
    {/* Top bar + drawer — mobile */}
    <div className="md:hidden flex-shrink-0 border-b border-gray-800 bg-black flex items-center justify-between px-4 py-3">
      <p className="font-bold">Plataforma <span className="text-blue-400">B2B</span></p>
      <button onClick={() => setMobileOpen(true)} className="p-1.5 text-gray-300" aria-label="Abrir menu">
        <Menu size={20} />
      </button>
    </div>
    {mobileOpen && (
      <div className="md:hidden fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
        <div className="absolute inset-y-0 left-0 w-64 bg-black border-r border-gray-800 flex flex-col">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <p className="font-bold">Plataforma <span className="text-blue-400">B2B</span></p>
            <button onClick={() => setMobileOpen(false)} className="p-1 text-gray-400" aria-label="Fechar menu"><X size={18} /></button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
            {nav.filter(i => i.show).map((item) => {
              const active = !item.locked && (item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href));
              const Icon = ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium border-l-2 transition-colors ${
                    active
                      ? "text-white bg-blue-500/10 border-blue-500"
                      : item.locked
                        ? "text-gray-600 border-transparent hover:text-gray-400"
                        : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={17} className={active ? "text-blue-400" : ""} />
                  {item.label}
                  {item.locked && <Lock size={12} className="ml-auto flex-shrink-0" />}
                </Link>
              );
            })}
          </nav>
          <div className="px-4 py-4 border-t border-gray-800 flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profileName}</p>
              <p className="text-xs text-gray-500 truncate">{email}</p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Sidebar — desktop */}
    <aside className="hidden md:flex w-60 flex-shrink-0 border-r border-gray-800 bg-black flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="font-bold text-lg">
          Plataforma <span className="text-blue-400">B2B</span>
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {nav.filter(i => i.show).map((item) => {
          const active = !item.locked && (item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href));
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium border-l-2 transition-colors ${
                active
                  ? "text-white bg-blue-500/10 border-blue-500"
                  : item.locked
                    ? "text-gray-600 border-transparent hover:text-gray-400"
                    : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={17} className={active ? "text-blue-400" : ""} />
              {item.label}
              {item.locked && <Lock size={12} className="ml-auto flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800 flex items-center gap-3">
        <UserButton afterSignOutUrl="/" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{profileName}</p>
          <p className="text-xs text-gray-500 truncate">{email}</p>
        </div>
      </div>
    </aside>
    </>
  );
}
