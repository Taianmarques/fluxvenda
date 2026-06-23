"use client";

import { useEffect, useRef, useState } from "react";
import { WhatsappPipeline, type Stage } from "./WhatsappPipeline";

type ConversationSummary = {
  id: string;
  contactName: string | null;
  contactNumber: string;
  status: string;
  humanTakeover: boolean;
  stageId: string | null;
  dealValue: number | null;
  updatedAt: string;
  lastMessage: string | null;
};

type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type ConversationDetail = {
  id: string;
  contactName: string | null;
  contactNumber: string;
  humanTakeover: boolean;
  messages: Message[];
};

function timeAgo(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function WhatsappInbox({
  agentName, initialConversations, initialStages,
}: {
  agentName: string;
  initialConversations: ConversationSummary[];
  initialStages: Stage[];
}) {
  const [view, setView] = useState<"lista" | "pipeline">("lista");
  const [conversations, setConversations] = useState(initialConversations);
  const [stages, setStages] = useState(initialStages);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refreshList() {
    try {
      const res = await fetch("/api/ferramentas/whatsapp/conversas");
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations.map((c: any) => ({
          id: c.id, contactName: c.contactName, contactNumber: c.contactNumber,
          status: c.status, humanTakeover: c.humanTakeover, stageId: c.stageId, dealValue: c.dealValue, updatedAt: c.updatedAt,
          lastMessage: c.messages[0]?.content ?? null,
        })));
      }
    } catch {}
  }

  async function refreshStages() {
    try {
      const res = await fetch("/api/ferramentas/whatsapp/etapas");
      const data = await res.json();
      if (data.stages) setStages(data.stages);
    } catch {}
  }

  async function refreshDetail(id: string) {
    try {
      const res = await fetch(`/api/ferramentas/whatsapp/conversas/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setDetail(data.conversation);
    } catch {}
  }

  useEffect(() => {
    const interval = setInterval(refreshList, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    refreshDetail(selectedId);
    const interval = setInterval(() => refreshDetail(selectedId), 3000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages.length]);

  async function handleSend() {
    if (!input.trim() || !selectedId || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}/mensagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      await refreshDetail(selectedId);
      await refreshList();
    } finally {
      setSending(false);
    }
  }

  async function handleRetomar() {
    if (!selectedId) return;
    await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}/retomar`, { method: "POST" });
    await refreshDetail(selectedId);
  }

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="font-bold text-lg">💬 WhatsApp</p>
          <p className="text-xs text-gray-500">Agente: {agentName}</p>
        </div>
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setView("lista")}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${view === "lista" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"}`}
          >
            💬 Lista
          </button>
          <button
            onClick={() => setView("pipeline")}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${view === "pipeline" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"}`}
          >
            📋 Pipeline
          </button>
        </div>
      </div>

      {view === "pipeline" ? (
        <WhatsappPipeline
          stages={stages}
          conversations={conversations}
          onSelectConversation={id => { setSelectedId(id); setView("lista"); }}
          onStagesChange={refreshStages}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Lista de conversas */}
          <aside className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-500 p-4">Nenhuma conversa ainda.</p>
              ) : (
                conversations.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-900 hover:bg-gray-900 transition-colors ${selectedId === c.id ? "bg-gray-900" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{c.contactName || c.contactNumber}</p>
                      {c.humanTakeover && <span className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded-full bg-orange-900/50 text-orange-300 border border-orange-700">manual</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{c.lastMessage || "—"}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(c.updatedAt)}</p>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Conversa selecionada */}
          <main className="flex-1 flex flex-col">
            {!detail ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Selecione uma conversa
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">{detail.contactName || detail.contactNumber}</p>
                    <p className="text-xs text-gray-500">{detail.contactNumber}</p>
                  </div>
                  {detail.humanTakeover ? (
                    <button onClick={handleRetomar} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200">
                      ↩ Devolver para o agente
                    </button>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-900/40 text-green-300 border border-green-800/50">🤖 Agente respondendo</span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-2 bg-[#0b141a]">
                  {detail.messages.map(m => {
                    const isOutgoing = m.role === "assistant" || m.role === "human";
                    return (
                      <div key={m.id} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          m.role === "human" ? "bg-green-700 text-white" :
                          m.role === "assistant" ? "bg-[#005c4b] text-white" :
                          "bg-[#202c33] text-gray-100"
                        }`}>
                          {m.role === "human" && <p className="text-[10px] opacity-70 mb-0.5">Você (atendente)</p>}
                          {m.role === "assistant" && <p className="text-[10px] opacity-70 mb-0.5">🤖 {agentName}</p>}
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <p className="text-[10px] opacity-60 mt-1 text-right">{new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="p-4 border-t border-gray-800 flex gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Digite uma mensagem para assumir a conversa..."
                    className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-600"
                  />
                  <button onClick={handleSend} disabled={sending} className="bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-xl px-5 py-2.5 text-sm font-medium">
                    Enviar
                  </button>
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
