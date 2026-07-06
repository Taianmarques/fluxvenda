"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Search, X, Instagram, MessageCircle, Users, ShoppingBag, TrendingUp, Bot } from "lucide-react";

export type CarteiraCliente = {
  contactNumber: string;
  contactName: string | null;
  conversationId: string;
  lastContactAt: string; // ISO
  assignedToName: string | null;
  leadStatusName: string | null;
  leadStatusColor: string | null;
  totalComprado: number;
  pedidos: number;
  lastPurchaseAt: string | null; // ISO
};

type Filtro = "todos" | "compraram" | "sem_compra" | "inativos";
type Ordem = "recentes" | "valor" | "pedidos";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function isIg(n: string) { return n.startsWith("ig_"); }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}m atrás` : `${Math.floor(months / 12)}a atrás`;
}

const INATIVO_DIAS = 30;

export type CarteiraConfig = {
  carteiraEnabled: boolean;
  posVendaEnabled: boolean;
  posVendaDelayHours: number;
  posVendaMensagem: string;
  recompraEnabled: boolean;
  recompraDias: number;
  carteiraInstrucoes: string;
};

export function CarteiraClient({ agentId, clientes, initialConfig, isManager }: {
  agentId: string;
  clientes: CarteiraCliente[];
  initialConfig?: CarteiraConfig;
  isManager?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [ordem, setOrdem] = useState<Ordem>("recentes");

  // Configuração do agente de carteira (pós-venda + recompra)
  const [showConfig, setShowConfig] = useState(false);
  const [cfg, setCfg] = useState<CarteiraConfig>(initialConfig ?? {
    carteiraEnabled: false, posVendaEnabled: true, posVendaDelayHours: 24,
    posVendaMensagem: "", recompraEnabled: true, recompraDias: 30, carteiraInstrucoes: "",
  });
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfgSaved, setCfgSaved] = useState(false);

  async function handleSaveConfig() {
    setSavingCfg(true);
    setCfgSaved(false);
    try {
      const res = await fetch(`/api/agentes/${agentId}/carteira`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (res.ok) { setCfgSaved(true); setTimeout(() => setCfgSaved(false), 2500); }
    } finally { setSavingCfg(false); }
  }

  const resumo = useMemo(() => {
    const compraram = clientes.filter(c => c.totalComprado > 0);
    const receita = compraram.reduce((s, c) => s + c.totalComprado, 0);
    return {
      total: clientes.length,
      compraram: compraram.length,
      receita,
      ticket: compraram.length > 0 ? receita / compraram.length : 0,
    };
  }, [clientes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff = Date.now() - INATIVO_DIAS * 86400000;
    let base = clientes;
    if (filtro === "compraram") base = base.filter(c => c.totalComprado > 0);
    if (filtro === "sem_compra") base = base.filter(c => c.totalComprado === 0);
    if (filtro === "inativos") base = base.filter(c => new Date(c.lastContactAt).getTime() < cutoff);
    if (q) {
      base = base.filter(c =>
        (c.contactName ?? "").toLowerCase().includes(q) || c.contactNumber.includes(q)
      );
    }
    return [...base].sort((a, b) => {
      if (ordem === "valor") return b.totalComprado - a.totalComprado;
      if (ordem === "pedidos") return b.pedidos - a.pedidos;
      return b.lastContactAt.localeCompare(a.lastContactAt);
    });
  }, [clientes, search, filtro, ordem]);

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "compraram", label: "Compraram" },
    { key: "sem_compra", label: "Sem compra" },
    { key: "inativos", label: `Inativos +${INATIVO_DIAS}d` },
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-gray-400 text-sm">Atendimento</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <Briefcase size={26} className="text-blue-400" /> Carteira de clientes
            </h1>
          </div>
          {isManager && (
            <button
              onClick={() => setShowConfig(s => !s)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                cfg.carteiraEnabled ? "bg-green-700 hover:bg-green-600" : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              <Bot size={15} />
              {cfg.carteiraEnabled ? "Agente de carteira ativo" : "Configurar agente"}
            </button>
          )}
        </div>

        {showConfig && isManager && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
            <div>
              <p className="font-semibold">Agente de gestão de carteira</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Trabalha a carteira sozinho pelo WhatsApp: agradece após a compra (pós-venda) e reativa quem sumiu (recompra).
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.carteiraEnabled} onChange={e => setCfg(c => ({ ...c, carteiraEnabled: e.target.checked }))} className="w-4 h-4" />
              <span className="text-sm font-medium">Ativar agente de carteira</span>
            </label>

            {/* Pós-venda */}
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cfg.posVendaEnabled} onChange={e => setCfg(c => ({ ...c, posVendaEnabled: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm font-medium">Pós-venda automático</span>
              </label>
              {cfg.posVendaEnabled && (
                <div className="space-y-3 pl-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    Enviar
                    <input
                      type="number" min={1} max={168} value={cfg.posVendaDelayHours}
                      onChange={e => setCfg(c => ({ ...c, posVendaDelayHours: Math.min(168, Math.max(1, Number(e.target.value))) }))}
                      className="w-20 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm text-white"
                    />
                    horas depois do pagamento confirmado
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Mensagem fixa (opcional — vazio = a IA escreve personalizada citando o pedido)</label>
                    <textarea
                      value={cfg.posVendaMensagem}
                      onChange={e => setCfg(c => ({ ...c, posVendaMensagem: e.target.value }))}
                      rows={2}
                      placeholder={"Ex: Oi {nome}! Passando pra agradecer sua compra. Chegou tudo certinho? Qualquer coisa é só chamar!"}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm resize-none"
                      maxLength={1000}
                    />
                    <p className="text-xs text-gray-600 mt-0.5">{"{nome}"} vira o primeiro nome do cliente.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Recompra */}
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cfg.recompraEnabled} onChange={e => setCfg(c => ({ ...c, recompraEnabled: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm font-medium">Recompra automática (reativação)</span>
              </label>
              {cfg.recompraEnabled && (
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    Contatar quem não compra há
                    <input
                      type="number" min={3} max={180} value={cfg.recompraDias}
                      onChange={e => setCfg(c => ({ ...c, recompraDias: Math.min(180, Math.max(3, Number(e.target.value))) }))}
                      className="w-20 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm text-white"
                    />
                    dias
                  </div>
                  <p className="text-xs text-gray-600">
                    A IA escreve uma mensagem pessoal citando a última compra. Um toque por ciclo: o cliente só recebe de novo se voltar a comprar. Não interrompe conversas ativas nem atendimentos manuais.
                  </p>
                </div>
              )}
            </div>

            {/* Instruções */}
            <div className="border-t border-gray-800 pt-4">
              <label className="text-xs text-gray-400 block mb-1">Orientações para a IA (opcional)</label>
              <textarea
                value={cfg.carteiraInstrucoes}
                onChange={e => setCfg(c => ({ ...c, carteiraInstrucoes: e.target.value }))}
                rows={2}
                placeholder="Ex: ofereça 10% de desconto na segunda compra com o cupom VOLTA10; nunca mencione concorrentes..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm resize-none"
                maxLength={1000}
              />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSaveConfig} disabled={savingCfg} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
                {savingCfg ? "Salvando..." : "Salvar"}
              </button>
              {cfgSaved && <span className="text-xs text-green-400">Salvo!</span>}
            </div>
          </div>
        )}

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Clientes na carteira", value: String(resumo.total), icon: Users },
            { label: "Já compraram", value: String(resumo.compraram), icon: ShoppingBag },
            { label: "Receita total", value: brl(resumo.receita), icon: TrendingUp },
            { label: "Ticket médio", value: brl(resumo.ticket), icon: TrendingUp },
          ].map(card => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-xl md:text-2xl font-bold text-blue-400 truncate">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Busca + filtros */}
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
              <Search size={14} className="text-gray-500 flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome ou número..."
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-600"
              />
              {search && <button onClick={() => setSearch("")} className="text-gray-500 hover:text-white"><X size={14} /></button>}
            </div>
            <select
              value={ordem}
              onChange={e => setOrdem(e.target.value as Ordem)}
              className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm"
            >
              <option value="recentes">Último contato</option>
              <option value="valor">Maior valor</option>
              <option value="pedidos">Mais pedidos</option>
            </select>
          </div>
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {FILTROS.map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`flex-shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                  filtro === f.key ? "bg-blue-600 border-blue-600 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 p-6 text-center">
              {clientes.length === 0 ? "Nenhum cliente ainda — a carteira se preenche conforme as conversas chegam." : "Nenhum cliente com esse filtro."}
            </p>
          ) : (
            <div className="divide-y divide-gray-800">
              {filtered.map(c => (
                <Link
                  key={c.contactNumber}
                  href={`/crm/${agentId}?c=${c.conversationId}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isIg(c.contactNumber) ? "bg-pink-900/40 text-pink-400" : "bg-green-900/40 text-green-400"}`}>
                    {isIg(c.contactNumber) ? <Instagram size={15} /> : <MessageCircle size={15} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{c.contactName || c.contactNumber.replace("ig_", "ID ")}</p>
                      {c.leadStatusName && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0"
                          style={{ color: c.leadStatusColor ?? undefined, borderColor: `${c.leadStatusColor}66` }}
                        >
                          {c.leadStatusName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {c.contactName && !isIg(c.contactNumber) ? `${c.contactNumber} · ` : ""}
                      contato {timeAgo(c.lastContactAt)}
                      {c.assignedToName && ` · ${c.assignedToName}`}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${c.totalComprado > 0 ? "text-green-400" : "text-gray-600"}`}>
                      {c.totalComprado > 0 ? brl(c.totalComprado) : "—"}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {c.pedidos > 0
                        ? `${c.pedidos} compra${c.pedidos === 1 ? "" : "s"}${c.lastPurchaseAt ? ` · ${timeAgo(c.lastPurchaseAt)}` : ""}`
                        : "sem compras"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
