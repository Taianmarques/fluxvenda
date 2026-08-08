"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, StickyNote, Send } from "lucide-react";

type Message = {
  id: string;
  role: string; // user | assistant | note
  content: string;
  createdAt: string;
};

export function SimuladorClient({ agentId }: { agentId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/agentes/${agentId}/testar-conversa`)
      .then(res => res.json())
      .then(data => { if (data.messages) setMessages(data.messages); })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [agentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setError("");
    // Otimista: mostra a mensagem do "cliente" na hora, sem esperar o round-trip
    setMessages(prev => [...prev, { id: `pending-${Date.now()}`, role: "user", content: message, createdAt: new Date().toISOString() }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/agentes/${agentId}/testar-conversa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao simular a conversa."); return; }
      setMessages(data.messages ?? []);
    } catch {
      setError("Erro ao simular a conversa. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!window.confirm("Reiniciar a conversa de teste? O histórico simulado será apagado.")) return;
    setResetting(true);
    try {
      await fetch(`/api/agentes/${agentId}/testar-conversa`, { method: "DELETE" });
      setMessages([]);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-[70vh]">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Simulador de conversa</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Roda o pipeline real: ferramentas do SDR, RAG dos exemplos de treino, humanização e emoji — igual sai no WhatsApp de verdade. Nada aqui vira mensagem real nem aparece nos relatórios.
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting || messages.length === 0}
          className="text-xs text-gray-400 hover:text-red-400 disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
        >
          <RotateCcw size={13} /> Reiniciar
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-950">
        {loadingHistory ? (
          <p className="text-xs text-gray-500 text-center mt-8">Carregando...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-500 text-center mt-8">Envie uma mensagem como se fosse um cliente pra começar a simulação.</p>
        ) : (
          messages.map(m => {
            if (m.role === "note" && m.content.startsWith("TRANSFER:")) {
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="w-full max-w-md bg-blue-600 text-white text-xs font-medium text-center rounded-lg px-3 py-2">
                    {m.content.replace(/^TRANSFER:\s*/, "")}
                  </div>
                </div>
              );
            }
            if (m.role === "note") {
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-amber-900/30 border border-amber-800/40 text-amber-100">
                    <p className="text-[10px] opacity-80 mb-0.5 flex items-center gap-1 text-amber-300">
                      <StickyNote size={10} /> Nota interna (gerada pela IA)
                    </p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              );
            }
            const isOutgoing = m.role === "assistant";
            return (
              <div key={m.id} className={`flex ${isOutgoing ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${isOutgoing ? "bg-gray-800 text-gray-200" : "bg-blue-600 text-white"}`}>
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        {loading && <p className="text-xs text-gray-500">digitando...</p>}
      </div>

      {error && <p className="text-sm text-red-400 px-4 pt-2">{error}</p>}

      <div className="p-3 border-t border-gray-800 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Digite uma mensagem de teste, como se fosse o cliente..."
          className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5"
        >
          <Send size={14} /> Enviar
        </button>
      </div>
    </div>
  );
}
