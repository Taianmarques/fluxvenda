"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; content: string };

export function TestAgentChat({ agentId }: { agentId: string }) {
  const [showTest, setShowTest] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  async function handleSendTest() {
    if (!chatInput.trim() || chatLoading) return;
    const message = chatInput.trim();
    const nextChat: ChatMsg[] = [...chat, { role: "user", content: message }];
    setChat(nextChat);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`/api/agentes/${agentId}/testar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: chat }),
      });
      const data = await res.json();
      setChat([...nextChat, { role: "assistant", content: data.reply ?? "—" }]);
    } catch {
      setChat([...nextChat, { role: "assistant", content: "Erro ao testar o agente." }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setShowTest(s => !s)}
        className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
      >
        {showTest ? "Ocultar teste do agente" : <><FlaskConical size={14} /> Testar agente</>}
      </button>

      {showTest && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3 mt-3">
          <div className="h-64 overflow-y-auto space-y-2 bg-gray-950 rounded-xl p-3">
            {chat.length === 0 && <p className="text-xs text-gray-500">Envie uma mensagem como se fosse um cliente no WhatsApp.</p>}
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && <p className="text-xs text-gray-500">digitando...</p>}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendTest()}
              placeholder="Digite uma mensagem de teste..."
              className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
            <button onClick={handleSendTest} disabled={chatLoading} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium">
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
