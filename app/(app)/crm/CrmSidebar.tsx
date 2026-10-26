"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, Bot, Megaphone, TrendingUp, Zap, Settings, Headset, ShoppingBag, PanelLeftClose, PanelLeftOpen, LayoutDashboard, Home, Search, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CRM_CATEGORIES, type CrmPageDef, type CrmPageKey } from "@/lib/crm-nav-config";
import { NotificationsButton } from "./NotificationsButton";
import { UserMenu } from "../UserMenu";

type NavItem = { href: string; label: string; icon: LucideIcon; isHub?: boolean };
type NavCategory = { key: string; label: string; variant: "accordion" | "flyout"; items: NavItem[] };

// Ícone de cada categoria — CRM_CATEGORIES só define ícone por página, não por categoria.
// atendimento/vendas só usam o ícone no modo recolhido (viram flyout também nesse modo).
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  dashboards: LayoutDashboard,
  atendimento: Headset,
  vendas: ShoppingBag,
  marketing: Megaphone,
  gestao: TrendingUp,
  automacao: Zap,
  configuracoes: Settings,
};

const SIDEBAR_COLLAPSED_KEY = "crm_sidebar_collapsed";

// Visual do menu: fundo marinho, item ativo preenchido em azul, itens compactos (cabe na altura
// de um notebook sem rolar) e barra de rolagem fina que só aparece ao passar o mouse.
const ITEM_BASE = "flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70";
const ITEM_IDLE = "text-slate-400 hover:text-white hover:bg-white/[0.05]";
const ITEM_ACTIVE = "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-[0_6px_16px_-8px_rgba(37,99,235,0.8)]";
const ITEM_GROUP_ACTIVE = "text-white bg-white/[0.07]";

// Seções do menu — agrupam as categorias do CRM_CATEGORIES (lib/crm-nav-config.ts) por assunto
const SECTIONS: { label: string; keys: string[] }[] = [
  { label: "Operação", keys: ["atendimento", "vendas"] },
  { label: "Crescimento", keys: ["marketing", "automacao"] },
  { label: "Administração", keys: ["gestao", "configuracoes"] },
];

function normaliza(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Categoria com submenu flutuante pro lado (flyout), em vez de expandir pra baixo.
// Usa position:fixed com coordenadas calculadas via getBoundingClientRect() do botão — o
// <nav> pai tem overflow-y-auto, e por regra do CSS isso também clipa o eixo horizontal
// (overflow-x vira "auto" junto), então position:absolute ficaria preso dentro do menu.
function CategoryFlyout({ label, icon: Icon, items, isActive, pathname, onNavigate, collapsed = false }: {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  isActive: (item: NavItem) => boolean;
  pathname: string;
  onNavigate: (href: string) => void;
  collapsed?: boolean;
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
        title={collapsed ? label : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`w-full ${ITEM_BASE} ${
          collapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2"
        } ${active ? ITEM_GROUP_ACTIVE : ITEM_IDLE}`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <Icon size={17} className={active ? "text-blue-400" : ""} />
          {!collapsed && <span className="truncate">{label}</span>}
        </span>
        {!collapsed && (
          <span className="flex items-center gap-1.5 min-w-0">
            {active && <span className="text-[11px] text-slate-400 truncate max-w-[80px]">{items.find(isActive)?.label}</span>}
            <ChevronRight size={14} className={`text-slate-500 flex-shrink-0 transition-transform ${open ? "translate-x-0.5" : ""}`} />
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="fixed z-20 w-56 bg-[#0e1529] border border-white/[0.08] rounded-xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] p-1.5 space-y-0.5"
            style={{ top: Math.min(pos.top, (typeof window !== "undefined" ? window.innerHeight : 800) - (items.length * 38 + 48)), left: pos.left }}
          >
            <p className="px-3 pt-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            {items.map(item => {
              const itemActive = isActive(item);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => { setOpen(false); if (pathname !== item.href) onNavigate(item.href); }}
                  role="menuitem"
                  className={`${ITEM_BASE} px-3 py-2 ${itemActive ? ITEM_ACTIVE : "text-slate-300 hover:text-white hover:bg-white/[0.06]"}`}
                >
                  <item.icon size={16} />
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

export function CrmSidebar({ agentId, agents, allowedPages, isManager, menuLogo, hasPlataforma, userName }: {
  agentId: string;
  agents: { id: string; nome: string }[];
  // null = acesso total (gestor, ou membro sem perfil atribuído)
  allowedPages: CrmPageKey[] | null;
  // Hub de IA (criação/gestão de agentes) é só do gestor — atendentes não veem
  isManager: boolean;
  // Logo customizada pelo Super Admin (data URI) — null = usa o ícone padrão
  menuLogo?: string | null;
  // Link "Plataforma B2B" só aparece se o Super Admin ativou o módulo PLATAFORMA pra essa equipe
  hasPlataforma: boolean;
  // Nome de quem está logado — mostrado no menu de usuário (avatar + "Sair"), no rodapé do menu
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Menu recolhido (só ícones) — desktop apenas, preferência lembrada por navegador
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"
  );
  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }

  // Navegação otimista: marca o item clicado e mostra a barra de progresso na hora,
  // mantendo a página atual visível até a próxima terminar de carregar
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  useEffect(() => { setNavigatingTo(null); }, [pathname]);

  // Sem agente, todas as abas redirecionam pro Hub — mas só o item "Hub" de verdade deve
  // aparecer destacado, senão todas ficam "ativas" ao mesmo tempo.
  function isActive(item: { href: string; isHub?: boolean }) {
    const target = navigatingTo ?? pathname;
    // "/crm/hub/inicio" tem aba própria (Início) — não pode acender "Hub de IA" junto, senão
    // os dois ficam destacados ao mesmo tempo (startsWith("/crm/hub") também bate em inicio).
    if (item.isHub && target.startsWith("/crm/hub/inicio")) return false;
    if (!agentId) return Boolean(item.isHub) && target.startsWith("/crm/hub");
    return item.href === `/crm/${agentId}` ? target === item.href : target.startsWith(item.href);
  }

  // Sem nenhum agente ainda não dá pra montar uma URL real (/crm/[agentId]/...) — todas as
  // abas continuam visíveis, mas apontam pro Hub, onde o primeiro agente é criado.
  const agentPath = (suffix: string) => agentId ? `/crm/${agentId}${suffix}` : "/crm/hub";

  const HUB_ITEM: NavItem = { href: "/crm/hub", label: "Agentes de IA", icon: Bot, isHub: true };
  // Página de boas-vindas/checklist promovida a aba fixa — só pro gestor (dono da conta),
  // que é quem completa os passos de configuração inicial da equipe.
  const INICIO_ITEM: NavItem = { href: "/crm/hub/inicio", label: "Início", icon: Home };

  // Com perfil de acesso atribuído (allowedPages != null), só aparece o que está marcado —
  // inclusive as páginas managerOnly (aovivo/campanhas/auditoria) somem, já que nem são
  // marcáveis no perfil. Sem perfil (gestor ou membro com acesso total), aparece tudo.
  function isPageVisible(page: CrmPageDef) {
    if (page.hiddenFromSidebar) return false;
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

  // Categoria com um único item visível (ex: "Dashboards" só com "Visão Geral") vira link
  // direto — sem cabeçalho de categoria pra abrir, que ficaria redundante com o próprio item.
  const SINGLE_ITEM_CATEGORIES = CATEGORIES.filter(c => c.items.length === 1);

  // Ordem do menu mobile acompanha o desktop: Atendimento/Vendas primeiro, Hub de IA e
  // Visão Geral logo depois, resto por último.
  const FLAT_NAV: NavItem[] = [
    ...CATEGORIES.filter(c => c.key === "atendimento" || c.key === "vendas").flatMap(c => c.items),
    ...(isManager ? [INICIO_ITEM, HUB_ITEM] : []),
    ...CATEGORIES.filter(c => c.key !== "atendimento" && c.key !== "vendas").flatMap(c => c.items),
  ];

  const currentAgent = agents.find(a => a.id === agentId);
  const MULTI_ITEM_CATEGORIES = CATEGORIES.filter(c => c.items.length > 1);

  // Pesquisar no menu: todas as páginas visíveis, com o nome do grupo pra diferenciar
  const [busca, setBusca] = useState("");
  const TODAS_PAGINAS: (NavItem & { grupo?: string })[] = [
    ...(isManager ? [INICIO_ITEM, HUB_ITEM] : []),
    ...CATEGORIES.flatMap(c => c.items.map(i => ({ ...i, grupo: c.items.length > 1 ? c.label : undefined }))),
  ];
  const termo = normaliza(busca.trim());
  const resultados = termo
    ? TODAS_PAGINAS.filter(p => normaliza(p.label).includes(termo) || (p.grupo && normaliza(p.grupo).includes(termo))).slice(0, 12)
    : [];

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
        <div className="flex items-center gap-1 px-2 flex-shrink-0">
          <NotificationsButton compact />
          <UserMenu name={userName} openDirection="down" align="end" />
        </div>
      </div>
    </div>

    {/* Sidebar vertical — desktop: seções com rótulo, grupos abrem submenu pro lado */}
    <aside className={`hidden md:flex flex-shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#0c1326] via-[#090f1f] to-[#060a15] transition-[width] duration-150 ${collapsed ? "w-[68px]" : "w-60"}`}>
      <style>{`
        .crm-nav-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
        .crm-nav-scroll:hover { scrollbar-color: rgba(148,163,184,0.25) transparent; }
        .crm-nav-scroll::-webkit-scrollbar { width: 6px; }
        .crm-nav-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 9999px; }
        .crm-nav-scroll:hover::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.25); }
      `}</style>

      <div className={`pt-4 pb-3 flex items-center gap-2.5 ${collapsed ? "justify-center px-2" : "px-5"}`}>
        {menuLogo ? (
          <img src={menuLogo} alt="FluxVenda" width={26} height={26} className="flex-shrink-0 rounded" />
        ) : (
          <Image src="/iconefluxvenda.png" alt="FluxVenda" width={26} height={26} className="flex-shrink-0" />
        )}
        {!collapsed && <span className="font-bold text-[17px] tracking-[-0.01em] text-white">FluxVenda</span>}
      </div>

      {/* Agente atual em cartão (troca de agente quando há mais de um) */}
      <div className={`relative ${collapsed ? "px-2" : "px-3"}`}>
        <button
          onClick={() => agents.length > 1 && setShowSwitcher(s => !s)}
          title={collapsed ? (currentAgent?.nome ?? "Agente") : undefined}
          aria-haspopup={agents.length > 1 ? "menu" : undefined}
          aria-expanded={agents.length > 1 ? showSwitcher : undefined}
          className={`w-full flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 ${
            agents.length > 1 ? "hover:bg-white/[0.07] cursor-pointer" : "cursor-default"
          } ${collapsed ? "justify-center p-1.5" : "p-2"}`}
        >
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[13px] font-bold flex items-center justify-center flex-shrink-0">
            {(currentAgent?.nome ?? "A").trim().charAt(0).toUpperCase()}
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-white truncate">{currentAgent?.nome ?? "Nenhum agente"}</span>
                <span className="block text-[11.5px] text-slate-400 truncate">
                  {agents.length > 1 ? `${agents.length} agentes · trocar` : "Agente de IA"}
                </span>
              </span>
              {agents.length > 1 && <ChevronDown size={15} className="text-slate-500 flex-shrink-0" />}
            </>
          )}
        </button>
        {showSwitcher && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowSwitcher(false)} />
            <div role="menu" className={`absolute z-20 top-full mt-1.5 bg-[#0e1529] border border-white/[0.08] rounded-xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] p-1 space-y-0.5 max-h-72 overflow-y-auto ${
              collapsed ? "left-2 w-56" : "left-3 right-3"
            }`}>
              {agents.map(a => (
                <button
                  key={a.id}
                  role="menuitem"
                  onClick={() => switchAgent(a.id)}
                  className={`w-full text-left text-[13.5px] px-3 py-2 rounded-lg truncate ${a.id === agentId ? "text-white bg-blue-600/20" : "text-slate-300 hover:bg-white/[0.06]"}`}
                >
                  {a.nome}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pesquisar no menu: filtra todas as páginas; Enter abre a primeira */}
      {!collapsed && (
        <div className="px-3 pt-2.5">
          <label className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 focus-within:border-blue-500/60 transition-colors">
            <Search size={15} className="text-slate-500 flex-shrink-0" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && resultados[0]) { setBusca(""); if (pathname !== resultados[0].href) setNavigatingTo(resultados[0].href); router.push(resultados[0].href); }
                if (e.key === "Escape") setBusca("");
              }}
              placeholder="Pesquisar"
              aria-label="Pesquisar no menu"
              className="w-full bg-transparent text-[13.5px] text-white placeholder:text-slate-500 focus:outline-none"
            />
          </label>
        </div>
      )}

      <nav aria-label="Menu do CRM" className={`crm-nav-scroll flex-1 overflow-y-auto pt-2.5 pb-2 ${collapsed ? "px-2" : "px-3"}`}>
        {busca.trim() && !collapsed ? (
          <div className="space-y-0.5">
            {resultados.length === 0 && <p className="px-3 py-2 text-[12.5px] text-slate-500">Nada encontrado.</p>}
            {resultados.map(r => (
              <Link
                key={r.href + r.label}
                href={r.href}
                onClick={() => { setBusca(""); if (pathname !== r.href) setNavigatingTo(r.href); }}
                className={`${ITEM_BASE} px-3 py-2 ${isActive(r) ? ITEM_ACTIVE : ITEM_IDLE}`}
              >
                <r.icon size={16} />
                <span className="truncate flex-1">{r.label}</span>
                {r.grupo && <span className="text-[11px] text-slate-500 truncate">{r.grupo}</span>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Principal: Início, Agentes de IA (só gestor) e categorias de um item só (ex: Visão Geral) */}
            <div className="space-y-0.5">
              {[...(isManager ? [INICIO_ITEM, HUB_ITEM] : []), ...SINGLE_ITEM_CATEGORIES.map(c => c.items[0])].map(item => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={() => { if (pathname !== item.href) setNavigatingTo(item.href); }}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`${ITEM_BASE} ${collapsed ? "justify-center py-2.5" : "px-3 py-2"} ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
                  >
                    <item.icon size={17} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>

            {SECTIONS.map(sec => {
              const cats = MULTI_ITEM_CATEGORIES.filter(c => sec.keys.includes(c.key));
              if (cats.length === 0) return null;
              return (
                <div key={sec.label} className="space-y-0.5">
                  {collapsed
                    ? <div className="mx-auto mb-1.5 w-5 border-t border-white/[0.08]" aria-hidden />
                    : <p className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">{sec.label}</p>}
                  {cats.map(cat => (
                    <CategoryFlyout key={cat.key} label={cat.label} icon={CATEGORY_ICONS[cat.key]} items={cat.items} isActive={isActive} pathname={pathname} onNavigate={setNavigatingTo} collapsed={collapsed} />
                  ))}
                </div>
              );
            })}

            {/* Categorias fora das seções conhecidas (caso surjam novas no config) */}
            {MULTI_ITEM_CATEGORIES.filter(c => !SECTIONS.some(s => s.keys.includes(c.key))).map(cat => (
              <CategoryFlyout key={cat.key} label={cat.label} icon={CATEGORY_ICONS[cat.key] ?? LayoutDashboard} items={cat.items} isActive={isActive} pathname={pathname} onNavigate={setNavigatingTo} collapsed={collapsed} />
            ))}
          </div>
        )}
      </nav>

      {/* Rodapé compacto: usuário + notificações + recolher numa linha só */}
      <div className={`border-t border-white/[0.06] py-3 ${collapsed ? "px-2 space-y-1" : "px-3 space-y-1.5"}`}>
        <div className={collapsed ? "flex flex-col items-center gap-1" : "flex items-center gap-2 px-1"}>
          <UserMenu name={userName} />
          {!collapsed && <span className="flex-1 min-w-0 text-[13.5px] font-medium text-slate-200 truncate">{userName}</span>}
          <NotificationsButton compact />
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        {hasPlataforma && (
          <Link
            href="/dashboard"
            title={collapsed ? "Plataforma B2B" : undefined}
            className={`flex items-center gap-2 rounded-lg text-[12.5px] text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-colors ${collapsed ? "justify-center py-2" : "px-2 py-1.5"}`}
          >
            <ArrowLeft size={14} />
            {!collapsed && "Plataforma B2B"}
          </Link>
        )}
      </div>
    </aside>
    </>
  );
}
