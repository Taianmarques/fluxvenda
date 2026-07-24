"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, LayoutGrid, Megaphone, TrendingUp, Zap, Settings, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CRM_CATEGORIES, type CrmPageDef, type CrmPageKey } from "@/lib/crm-nav-config";
import { NotificationsButton } from "./NotificationsButton";

type NavItem = { href: string; label: string; icon: LucideIcon; isHub?: boolean };
type NavCategory = { key: string; label: string; variant: "accordion" | "flyout"; items: NavItem[] };

// Ícone de cada categoria flyout — CRM_CATEGORIES só define ícone por página, não por categoria
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  marketing: Megaphone,
  gestao: TrendingUp,
  automacao: Zap,
  configuracoes: Settings,
};

// Categoria que expande pra baixo (accordion) — usado pela maioria; Marketing e Automação
// usam CategoryFlyout (submenu flutuante pro lado) em vez desse.
function CategoryAccordion({ cat, isOpen, onToggle, isActive, pathname, onNavigate }: {
  cat: NavCategory;
  isOpen: boolean;
  onToggle: (key: string) => void;
  isActive: (item: NavItem) => boolean;
  pathname: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <div>
      <button
        onClick={() => onToggle(cat.key)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-300 uppercase tracking-wider transition-colors"
      >
        {cat.label}
        <ChevronDown size={13} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="space-y-0.5 mb-1">
          {cat.items.map(item => {
            const active = isActive(item);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => { if (pathname !== item.href) onNavigate(item.href); }}
                className={`flex items-center gap-3 pl-4 pr-3 py-2 rounded-xl text-sm font-medium border-l-2 transition-colors ${
                  active ? "text-white bg-blue-500/10 border-blue-500" : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon size={16} className={active ? "text-blue-400" : ""} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Categoria com submenu flutuante pro lado (flyout), em vez de expandir pra baixo.
// Usa position:fixed com coordenadas calculadas via getBoundingClientRect() do botão — o
// <nav> pai tem overflow-y-auto, e por regra do CSS isso também clipa o eixo horizontal
// (overflow-x vira "auto" junto), então position:absolute ficaria preso dentro do menu.
function CategoryFlyout({ label, icon: Icon, items, isActive, pathname, onNavigate }: {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  isActive: (item: NavItem) => boolean;
  pathname: string;
  onNavigate: (href: string) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const active = items.some(isActive);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.right + 8 });
    }
    setOpen(s => !s);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={toggle}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
          active ? "text-white bg-blue-500/10" : "text-gray-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <span className="flex items-center gap-3">
          <Icon size={17} className={active ? "text-blue-400" : ""} />
          {label}
        </span>
        <ChevronDown size={13} className={`-rotate-90 transition-transform ${open ? "rotate-0" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="fixed z-20 w-52 bg-gray-900 border border-gray-800 rounded-xl shadow-xl p-1.5 space-y-0.5"
            style={{ top: pos.top, left: pos.left }}
          >
            {items.map(item => {
              const itemActive = isActive(item);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => { setOpen(false); if (pathname !== item.href) onNavigate(item.href); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    itemActive ? "text-white bg-blue-500/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon size={16} className={itemActive ? "text-blue-400" : ""} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function CrmSidebar({ agentId, agents, allowedPages, isManager }: {
  agentId: string;
  agents: { id: string; nome: string }[];
  // null = acesso total (gestor, ou membro sem perfil atribuído)
  allowedPages: CrmPageKey[] | null;
  // Hub de IA (criação/gestão de agentes) é só do gestor — atendentes não veem
  isManager: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Navegação otimista: marca o item clicado e mostra a barra de progresso na hora,
  // mantendo a página atual visível até a próxima terminar de carregar
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  useEffect(() => { setNavigatingTo(null); }, [pathname]);

  // Sem agente, todas as abas redirecionam pro Hub — mas só o item "Hub" de verdade deve
  // aparecer destacado, senão todas ficam "ativas" ao mesmo tempo.
  function isActive(item: { href: string; isHub?: boolean }) {
    const target = navigatingTo ?? pathname;
    if (!agentId) return Boolean(item.isHub) && target.startsWith("/crm/hub");
    return item.href === `/crm/${agentId}` ? target === item.href : target.startsWith(item.href);
  }

  // Sem nenhum agente ainda não dá pra montar uma URL real (/crm/[agentId]/...) — todas as
  // abas continuam visíveis, mas apontam pro Hub, onde o primeiro agente é criado.
  const agentPath = (suffix: string) => agentId ? `/crm/${agentId}${suffix}` : "/crm/hub";

  const HUB_ITEM: NavItem = { href: "/crm/hub", label: "Hub de IA", icon: LayoutGrid, isHub: true };

  // Com perfil de acesso atribuído (allowedPages != null), só aparece o que está marcado —
  // inclusive as páginas managerOnly (aovivo/campanhas/auditoria) somem, já que nem são
  // marcáveis no perfil. Sem perfil (gestor ou membro com acesso total), aparece tudo.
  function isPageVisible(page: CrmPageDef) {
    if (allowedPages === null) return true;
    if (page.managerOnly) return false;
    return allowedPages.includes(page.key);
  }

  const CATEGORIES: NavCategory[] = CRM_CATEGORIES
    .map(cat => ({
      key: cat.key,
      label: cat.label,
      variant: cat.variant,
      items: cat.pages.filter(isPageVisible).map(p => ({ href: agentPath(p.suffix), label: p.label, icon: p.icon })),
    }))
    .filter(cat => cat.items.length > 0);

  const ACCORDION_CATEGORIES = CATEGORIES.filter(c => c.variant === "accordion");
  const FLYOUT_CATEGORIES = CATEGORIES.filter(c => c.variant === "flyout");

  const FLAT_NAV: NavItem[] = [...(isManager ? [HUB_ITEM] : []), ...CATEGORIES.flatMap(c => c.items)];

  // Categorias abertas no menu desktop — a que contém a página atual abre sozinha; as demais
  // o usuário abre/fecha manualmente, e várias podem ficar abertas ao mesmo tempo.
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    const active = ACCORDION_CATEGORIES.find(cat => cat.items.some(item => isActive(item)));
    return new Set(active ? [active.key] : []);
  });
  useEffect(() => {
    const active = ACCORDION_CATEGORIES.find(cat => cat.items.some(item => isActive(item)));
    if (active) setOpenCategories(prev => (prev.has(active.key) ? prev : new Set(prev).add(active.key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleCategory(key: string) {
    setOpenCategories(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const currentAgent = agents.find(a => a.id === agentId);

  function switchAgent(newAgentId: string) {
    setShowSwitcher(false);
    const suffix = pathname.split(`/crm/${agentId}`)[1] ?? "";
    router.push(`/crm/${newAgentId}${suffix}`);
  }

  return (
    <>
    {/* Barra de progresso da navegação — aparece enquanto a próxima página carrega */}
    {navigatingTo && (
      <div className="fixed top-0 inset-x-0 z-[60] h-0.5 overflow-hidden bg-blue-950">
        <div className="h-full w-1/3 bg-blue-500 rounded-full animate-[crm-progress_1s_ease-in-out_infinite]" />
        <style>{`@keyframes crm-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
      </div>
    )}

    {/* Barra horizontal — mobile (some quando uma conversa está aberta) — lista plana, sem categorias */}
    <div className='md:hidden flex-shrink-0 border-b border-gray-800 bg-black [[data-mobile-chat="1"]_&]:hidden'>
      {agents.length > 1 && (
        <div className="px-3 pt-2">
          <select
            value={agentId}
            onChange={e => switchAgent(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs"
          >
            {agents.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
      )}
      <div className="flex items-center">
        <nav className="flex-1 flex overflow-x-auto px-2 py-2 gap-1" style={{ scrollbarWidth: "none" }}>
          {FLAT_NAV.map(item => {
            const active = isActive(item);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => { if (pathname !== item.href) setNavigatingTo(item.href); }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium flex-shrink-0 transition-colors ${
                  active ? "text-blue-400 bg-blue-500/10" : "text-gray-400"
                }`}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <NotificationsButton compact />
      </div>
    </div>

    {/* Sidebar vertical — desktop, itens agrupados por categoria com dropdown */}
    <aside className="hidden md:flex w-56 flex-shrink-0 border-r border-gray-800 bg-black flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="font-bold text-lg">
          <span className="text-blue-400">CRM</span>
        </p>
      </div>

      {agents.length > 1 && (
        <div className="relative px-3 py-3 border-b border-gray-800">
          <button
            onClick={() => setShowSwitcher(s => !s)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-sm text-left transition-colors"
          >
            <span className="truncate">{currentAgent?.nome ?? "Agente"}</span>
            <ChevronDown size={15} className="text-gray-500 flex-shrink-0" />
          </button>
          {showSwitcher && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSwitcher(false)} />
              <div className="absolute z-20 left-3 right-3 top-full mt-1 bg-gray-900 border border-gray-800 rounded-xl shadow-xl p-1 space-y-0.5">
                {agents.map(a => (
                  <button
                    key={a.id}
                    onClick={() => switchAgent(a.id)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg truncate ${a.id === agentId ? "text-blue-400 bg-blue-500/10" : "text-gray-300 hover:bg-gray-800"}`}
                  >
                    {a.nome}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {/* Hub fica fixo no topo, fora de qualquer categoria — só pro gestor */}
        {isManager && (() => {
          const active = isActive(HUB_ITEM);
          return (
            <>
              <Link
                href={HUB_ITEM.href}
                onClick={() => { if (pathname !== HUB_ITEM.href) setNavigatingTo(HUB_ITEM.href); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium border-l-2 transition-colors ${
                  active ? "text-white bg-blue-500/10 border-blue-500" : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
                }`}
              >
                <HUB_ITEM.icon size={17} className={active ? "text-blue-400" : ""} />
                {HUB_ITEM.label}
              </Link>
              <div className="border-t border-gray-800 my-2" />
            </>
          );
        })()}

        {ACCORDION_CATEGORIES.map(cat => (
          <CategoryAccordion key={cat.key} cat={cat} isOpen={openCategories.has(cat.key)} onToggle={toggleCategory} isActive={isActive} pathname={pathname} onNavigate={setNavigatingTo} />
        ))}

        {FLYOUT_CATEGORIES.map(cat => (
          <CategoryFlyout key={cat.key} label={cat.label} icon={CATEGORY_ICONS[cat.key]} items={cat.items} isActive={isActive} pathname={pathname} onNavigate={setNavigatingTo} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800 space-y-0.5">
        <NotificationsButton />
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={17} />
          Plataforma B2B
        </Link>
      </div>
    </aside>
    </>
  );
}
