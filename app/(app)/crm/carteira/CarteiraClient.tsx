"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Search, X, Instagram, MessageCircle, Users, ShoppingBag, TrendingUp } from "lucide-react";

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

export function CarteiraClient({ agentId, clientes }: { agentId: string; clientes: CarteiraCliente[] }) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [ordem, setOrdem] = useState<Ordem>("recentes");

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
        <div>
          <p className="text-gray-400 text-sm">Atendimento</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
            <Briefcase size={26} className="text-blue-400" /> Carteira de clientes
          </h1>
        </div>

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
