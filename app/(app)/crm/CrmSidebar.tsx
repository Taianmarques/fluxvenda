"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, KanbanSquare, Calendar, Wallet, ShoppingCart, Landmark, Target, ArrowLeft, ChevronDown, Wifi, GitBranch, Briefcase, LayoutGrid, Zap, Filter, UserPlus, ClipboardCheck, Radio, Megaphone, Phone } from "lucide-react";
import { useEffect, useState } from "react";

export function CrmSidebar({ agentId, agents }: { agentId: string; agents: { id: string; nome: string }[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Navegação otimista: marca o item clicado e mostra a barra de progresso na hora,
  // mantendo a página atual visível até a próxima terminar de carregar
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  useEffect(() => { setNavigatingTo(null); }, [pathname]);

  function isActive(href: string) {
    const target = navigatingTo ?? pathname;
    return href === `/crm/${agentId}` ? target === href : target.startsWith(href);
  }

  const CRM_NAV = [
    { href: `/crm/hub`, label: "Hub", icon: LayoutGrid },
    { href: `/crm/${agentId}`, label: "Mensagens", icon: MessageCircle },
    { href: `/crm/${agentId}/aovivo`, label: "Ao vivo", icon: Radio },
    { href: `/crm/${agentId}/pipeline`, label: "Pipeline", icon: KanbanSquare },
    { href: `/crm/${agentId}/funil`, label: "Funil", icon: Filter },
    { href: `/crm/${agentId}/automacao`, label: "Automação", icon: Zap },
    { href: `/crm/${agentId}/agenda`, label: "Agenda", icon: Calendar },
    { href: `/crm/${agentId}/vendas`, label: "Vendas", icon: Wallet },
    { href: `/crm/${agentId}/carteira`, label: "Carteira", icon: Briefcase },
    { href: `/crm/${agentId}/comercio`, label: "Comércio", icon: ShoppingCart },
    { href: `/crm/${agentId}/cobranca`, label: "Cobranças", icon: Landmark },
    { href: `/crm/${agentId}/prospeccao`, label: "Prospecção", icon: Target },
    { href: `/crm/${agentId}/campanhas`, label: "Campanhas", icon: Megaphone },
    { href: `/crm/${agentId}/ligacoes`, label: "Ligações", icon: Phone },
    { href: `/crm/${agentId}/canais`, label: "Canais", icon: Wifi },
    { href: `/crm/${agentId}/condicoes`, label: "Condições", icon: GitBranch },
    { href: `/crm/${agentId}/equipe`, label: "Equipe", icon: UserPlus },
    { href: `/crm/${agentId}/auditoria`, label: "Auditoria", icon: ClipboardCheck },
  ];

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

    {/* Barra horizontal — mobile (some quando uma conversa está aberta) */}
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
      <nav className="flex overflow-x-auto px-2 py-2 gap-1" style={{ scrollbarWidth: "none" }}>
        {CRM_NAV.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
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
    </div>

    {/* Sidebar vertical — desktop */}
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
        {CRM_NAV.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => { if (pathname !== item.href) setNavigatingTo(item.href); }}
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
    </>
  );
}
