"use client";

import { useEffect, useRef, useState } from "react";
import { X, Bot, User as UserIcon, StickyNote, Forward } from "lucide-react";

type Message = {
  id: string;
  role: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt: string;
  sender?: { name: string } | null;
  forwarded?: boolean;
  replyTo?: { id: string; content: string; role: string; mediaType?: string | null; sender?: { name: string } | null } | null;
};

type ConversationDetail = {
  id: string;
  contactName: string | null;
  contactNumber: string;
  messages: Message[];
};

export function ConversationPopup({ conversationId, onClose, dark }: { conversationId: string; onClose: () => void; dark: boolean }) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    try {
      const res = await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}`);
      if (!res.ok) return;
      const data = await res.json();
      setDetail(data.conversation);
    } catch {}
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [detail?.messages.length]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}/mensagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      await refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-lg h-[600px] rounded-2xl border flex flex-col overflow-hidden ${dark ? "bg-gray-950 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}
      >
        <div className={`px-4 py-3 border-b flex items-center justify-between flex-shrink-0 ${dark ? "border-gray-800" : "border-gray-200"}`}>
          <div>
            <p className="font-semibold text-sm">{detail?.contactName || detail?.contactNumber || "Conversa"}</p>
            {detail?.contactName && <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-500"}`}>{detail.contactNumber}</p>}
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${dark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100"}`}>
            <X size={18} />
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${dark ? "bg-[#0b141a]" : "bg-[#e9edef]"}`}>
          {!detail ? (
            <p className={`text-sm text-center mt-10 ${dark ? "text-gray-500" : "text-gray-400"}`}>Carregando...</p>
          ) : (
            detail.messages.map(m => {
              if (m.role === "note") {
                return (
                  <div key={m.id} className="flex justify-center">
                    <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-amber-900/30 border border-amber-800/40 text-amber-100">
                      <p className="text-[10px] opacity-80 mb-0.5 flex items-center gap-1 text-amber-300">
                        <StickyNote size={10} /> Nota interna — {m.sender?.name ?? "Atendente"}
                      </p>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                );
              }
              const isOutgoing = m.role === "assistant" || m.role === "human";
              return (
                <div key={m.id} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "human" ? "bg-green-700 text-white" :
                      m.role === "assistant" ? "bg-[#005c4b] text-white" :
                      dark ? "bg-[#202c33] text-gray-100" : "bg-white text-gray-900"
                    }`}
                  >
                    {m.forwarded && (
                      <p className="text-[10px] opacity-60 mb-0.5 flex items-center gap-1 italic"><Forward size={10} /> Encaminhada</p>
                    )}
                    {m.replyTo && (
                      <div className="mb-1 rounded border-l-2 border-green-400 bg-black/20 px-2 py-1">
                        <p className="text-[10px] font-semibold opacity-80">
                          {m.replyTo.role === "assistant" ? "Agente" : m.replyTo.role === "human" ? (m.replyTo.sender?.name ?? "Atendente") : (detail?.contactName || detail?.contactNumber || "Cliente")}
                        </p>
                        <p className="text-xs opacity-70 line-clamp-2">
                          {m.replyTo.mediaType && (!m.replyTo.content || m.replyTo.content.startsWith("[")) ? <span className="italic">Mídia</span> : m.replyTo.content}
                        </p>
                      </div>
                    )}
                    {m.role === "human" && <p className="text-[10px] opacity-70 mb-0.5 flex items-center gap-1"><UserIcon size={10} /> {m.sender?.name ?? "Atendente"}</p>}
                    {m.role === "assistant" && <p className="text-[10px] opacity-70 mb-0.5 flex items-center gap-1"><Bot size={10} /> Agente</p>}
                    {m.mediaUrl ? (
                      <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        {m.content.startsWith("[") ? `[${m.mediaType ?? "mídia"}]` : m.content}
                      </a>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                    <p className="text-[10px] opacity-60 mt-1 text-right">{new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className={`p-3 border-t flex items-center gap-2 flex-shrink-0 ${dark ? "border-gray-800" : "border-gray-200"}`}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Digite uma mensagem..."
            className={`flex-1 text-sm rounded-xl px-3 py-2 border focus:outline-none ${dark ? "bg-gray-900 border-gray-800 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"}`}
          />
          <button onClick={handleSend} disabled={sending} className="bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-full px-4 py-2 text-sm font-medium text-white flex-shrink-0">
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
