"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserMenu } from "./UserMenu";
import {
  LayoutDashboard, ScanSearch, Target, Gamepad2, BookOpen, MessageSquare,
  PenTool, BookText, Trophy, Users, Headset, ShieldCheck, Menu, X, Coins, Lock, GraduationCap,
  Home, MessageSquareText, Box, Building2, Settings, BarChart3, ArrowRight,
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
      <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-900/40 flex-shrink-0">
        <BarChart3 size={21} className="text-white" />
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-lg leading-tight text-white">Vendas IA</span>
        <span className="block text-xs text-slate-400 leading-tight">Sua central de crescimento</span>
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
                ? "bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/40"
                : item.locked
                  ? "text-slate-500 hover:text-slate-300"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
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

// Cartão do rodapé do menu — leva pra vitrine de kits
function CartaoKits({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/biblioteca/explorar"
      onClick={onNavigate}
      className="group relative mx-3 mb-3 block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1b2a5c] to-[#141c3d] p-4 hover:border-white/20"
    >
      <p className="font-semibold text-white leading-snug">Venda mais<br />com o poder da IA</p>
      <p className="mt-1.5 text-xs text-slate-300 leading-relaxed pr-12">Prompts, ferramentas e estratégias prontas para o seu negócio.</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-300 group-hover:gap-1.5 transition-all">Explorar kits <ArrowRight size={13} /></span>
      <span aria-hidden className="absolute right-3 bottom-3 flex items-end gap-1">
        <span className="w-2.5 h-5 rounded-sm bg-blue-500/60" />
        <span className="w-2.5 h-8 rounded-sm bg-blue-500/80" />
        <span className="w-2.5 h-12 rounded-sm bg-gradient-to-t from-blue-500 to-violet-500" />
      </span>
    </Link>
  );
}

function Usuario({ profileName, email }: { profileName: string; email: string }) {
  return (
    <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3">
      <UserMenu name={profileName} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">{profileName}</p>
        <p className="text-xs text-slate-400 truncate">{email}</p>
      </div>
    </div>
  );
}

const FUNDO = "bg-gradient-to-b from-[#0d1735] via-[#0b132c] to-[#0a1024]";

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
          <CartaoKits onNavigate={fechar} />
          <Usuario profileName={profileName} email={email} />
        </div>
      </div>
    )}

    {/* Sidebar — desktop */}
    <aside className={`hidden md:flex w-64 flex-shrink-0 ${FUNDO} flex-col`}>
      <div className="px-5 pt-6 pb-2">
        <Marca />
      </div>
      <Itens nav={nav} pathname={pathname} />
      <CartaoKits />
      <Usuario profileName={profileName} email={email} />
    </aside>
    </>
  );
}
