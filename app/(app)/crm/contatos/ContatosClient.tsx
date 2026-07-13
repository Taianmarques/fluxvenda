"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookUser, Search, Pencil, MessageCircle, Download, Instagram } from "lucide-react";

export type Contato = {
  conversationId: string;
  contactName: string | null;
  contactNumber: string;
  leadStatusName: string | null;
  leadStatusColor: string | null;
  totalGanho: number;
  lastMessageAt: string | null;
};

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isIgContact(n: string): boolean {
  return n.startsWith("ig_");
}

export function ContatosClient({ agentId, contatos }: { agentId: string; contatos: Contato[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return contatos;
    return contatos.filter(c =>
      (c.contactName ?? "").toLowerCase().includes(q) || c.contactNumber.includes(q)
    );
  }, [busca, contatos]);

  async function handleRenomear(c: Contato) {
    const nome = window.prompt("Nome do contato", c.contactName ?? "");
    if (!nome || !nome.trim() || nome.trim() === c.contactName) return;
    setSalvando(c.conversationId);
    try {
      await fetch(`/api/ferramentas/whatsapp/conversas/${c.conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName: nome.trim() }),
      });
      router.refresh();
    } finally {
      setSalvando(null);
    }
  }

  function exportarCsv() {
    const linhas = [
      "nome;numero;status;total_ganho;ultima_interacao",
      ...filtrados.map(c => [
        (c.contactName ?? "").replace(/;/g, ","),
        c.contactNumber,
        (c.leadStatusName ?? "").replace(/;/g, ","),
        (c.totalGanho / 1).toFixed(2).replace(".", ","),
        c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString("pt-BR") : "",
      ].join(";")),
    ];
    const blob = new Blob(["﻿" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contatos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-gray-400 text-sm">Gestão</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <BookUser size={26} className="text-blue-400" /> Contatos
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Todos os contatos que já conversaram com esse agente. {contatos.length} no total.
            </p>
          </div>
          <button
            onClick={exportarCsv}
            disabled={filtrados.length === 0}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600/50 disabled:opacity-50 rounded-xl px-4 py-2 transition-colors"
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou número..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {filtrados.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 py-10 text-center">
              {contatos.length === 0 ? "Nenhum contato ainda — eles aparecem aqui quando alguém conversa com o agente." : "Nenhum contato encontrado com essa busca."}
            </p>
          ) : (
            <div className="divide-y divide-gray-800">
              {filtrados.map(c => (
                <div key={c.conversationId} className="flex items-center gap-3 px-4 md:px-5 py-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isIgContact(c.contactNumber) ? "bg-pink-900/40 text-pink-400" : "bg-blue-900/40 text-blue-400"}`}>
                    {isIgContact(c.contactNumber) ? <Instagram size={15} /> : <BookUser size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.contactName || <span className="text-gray-400">Sem nome</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {isIgContact(c.contactNumber) ? `Instagram · ${c.contactNumber.replace("ig_", "")}` : c.contactNumber}
                      {c.lastMessageAt && ` · última interação ${new Date(c.lastMessageAt).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  {c.leadStatusName && (
                    <span
                      className="hidden md:inline-block text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0"
                      style={{ color: c.leadStatusColor ?? "#9ca3af", borderColor: `${c.leadStatusColor ?? "#9ca3af"}55`, backgroundColor: `${c.leadStatusColor ?? "#9ca3af"}22` }}
                    >
                      {c.leadStatusName}
                    </span>
                  )}
                  {c.totalGanho > 0 && (
                    <span className="hidden md:inline text-xs font-semibold text-green-400 flex-shrink-0">{formatBRL(c.totalGanho)}</span>
                  )}
                  <button
                    onClick={() => handleRenomear(c)}
                    disabled={salvando === c.conversationId}
                    title={c.contactName ? "Renomear contato" : "Salvar nome do contato"}
                    className="text-gray-500 hover:text-white disabled:opacity-50 flex-shrink-0 p-1.5"
                  >
                    <Pencil size={14} />
                  </button>
                  <Link
                    href={`/crm/${agentId}?c=${c.conversationId}`}
                    title="Abrir conversa"
                    className="text-gray-500 hover:text-green-400 flex-shrink-0 p-1.5"
                  >
                    <MessageCircle size={15} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
