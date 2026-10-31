"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserMenu } from "./UserMenu";
import {
  LayoutDashboard, ScanSearch, Target, Gamepad2, BookOpen, MessageSquare,
  PenTool, BookText, Trophy, Users, Headset, ShieldCheck, Menu, X, Coins, Lock, GraduationCap,
  Home, MessageSquareText, Box, Building2, Settings, BarChart3, Star,
} from "lucide-react";

const ICONS = {
  inicio: Home,
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
  admin: ShieldCheck,
  creditos: Coins,
  plataforma: GraduationCap,
  biblioteca: BookOpen,
  favoritos: Star,
  prompts: MessageSquareText,
  kits: Box,
  empresa: Building2,
  configuracoes: Settings,
};

type NavItem = { href: string; label: string; icon: keyof typeof ICONS; show: boolean; locked: boolean };

// Item ativo = o de href mais específico que casa com a URL (/biblioteca/explorar acende
// "Explorar Kits", não "Minha Biblioteca")
function itemAtivo(nav: NavItem[], pathname: string) {
  return nav
    .filter(i => !i.locked && (pathname === i.href || pathname.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

function Marca() {
  return (
    <Link href="/inicio" className="flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl bg-[linear-gradient(135deg,#fff1c2,#fbbf24_55%,#f59e0b)] flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(251,191,36,.6)] flex-shrink-0">
        <BarChart3 size={21} className="text-[#2b1b02]" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold tracking-tight text-lg leading-tight text-[#edebe6]">Vendas <span className="text-[#fbbf24]">IA</span></span>
        <span className="block font-[family-name:var(--f-mono)] text-[10px] tracking-[0.14em] uppercase text-[rgba(237,235,230,.45)] leading-tight mt-0.5">Central de crescimento</span>
      </span>
    </Link>
  );
}

function Itens({ nav, pathname, onNavigate }: { nav: NavItem[]; pathname: string; onNavigate?: () => void }) {
  const visiveis = nav.filter(i => i.show);
  const ativo = itemAtivo(visiveis, pathname);
  return (
    <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
      {visiveis.map((item) => {
        const active = item.href === ativo;
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[15px] transition-colors ${
              active
                ? "bg-[rgba(251,191,36,.13)] text-[#fcd34d] font-medium ring-1 ring-inset ring-[rgba(251,191,36,.25)]"
                : item.locked
                  ? "text-[rgba(237,235,230,.4)] hover:text-[rgba(237,235,230,.7)]"
                  : "text-[rgba(237,235,230,.72)] hover:text-[#edebe6] hover:bg-white/[.05]"
            }`}
          >
            <Icon size={19} />
            {item.label}
            {item.locked && <Lock size={12} className="ml-auto flex-shrink-0" />}
          </Link>
        );
      })}
    </nav>
  );
}

function Usuario({ profileName, email }: { profileName: string; email: string }) {
  return (
    <div className="px-4 py-4 border-t border-white/[.08] flex items-center gap-3">
      <UserMenu name={profileName} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#edebe6] truncate">{profileName}</p>
        <p className="text-xs text-[rgba(237,235,230,.5)] truncate">{email}</p>
      </div>
    </div>
  );
}

// Mesmo fundo das landings, com um brilho âmbar discreto no topo
const FUNDO = "bg-[#0a0a0d] bg-[radial-gradient(120%_40%_at_0%_0%,rgba(251,191,36,.07),transparent)] font-[family-name:var(--f-ui)]";

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

  const fechar = () => setMobileOpen(false);

  return (
    <>
    {/* Top bar + drawer — mobile */}
    <div className={`md:hidden flex-shrink-0 border-b border-white/10 ${FUNDO} flex items-center justify-between px-4 py-3`}>
      <Marca />
      <button onClick={() => setMobileOpen(true)} className="p-1.5 text-slate-300" aria-label="Abrir menu">
        <Menu size={22} />
      </button>
    </div>
    {mobileOpen && (
      <div className="md:hidden fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/60" onClick={fechar} />
        <div className={`absolute inset-y-0 left-0 w-72 ${FUNDO} border-r border-white/10 flex flex-col`}>
          <div className="px-5 py-5 flex items-center justify-between">
            <Marca />
            <button onClick={fechar} className="p-1 text-slate-400" aria-label="Fechar menu"><X size={20} /></button>
          </div>
          <Itens nav={nav} pathname={pathname} onNavigate={fechar} />
          <Usuario profileName={profileName} email={email} />
        </div>
      </div>
    )}

    {/* Sidebar — desktop */}
    <aside className={`hidden md:flex w-64 flex-shrink-0 ${FUNDO} border-r border-white/[.06] flex-col`}>
      <div className="px-5 pt-6 pb-2">
        <Marca />
      </div>
      <Itens nav={nav} pathname={pathname} />
      <Usuario profileName={profileName} email={email} />
    </aside>
    </>
  );
}
