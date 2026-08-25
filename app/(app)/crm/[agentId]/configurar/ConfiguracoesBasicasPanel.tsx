"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfiguracoesBasicasPanel({
  agentId, initialResponseDelaySeconds, initialReadOnly, initialEmojiEnabled, initialAgentSignatureEnabled,
}: {
  agentId: string;
  initialResponseDelaySeconds: number;
  initialReadOnly: boolean;
  initialEmojiEnabled: boolean;
  initialAgentSignatureEnabled: boolean;
}) {
  const router = useRouter();
  const [responseDelaySeconds, setResponseDelaySeconds] = useState(initialResponseDelaySeconds);
  const [readOnly, setReadOnly] = useState(initialReadOnly);
  const [emojiEnabled, setEmojiEnabled] = useState(initialEmojiEnabled);
  const [agentSignatureEnabled, setAgentSignatureEnabled] = useState(initialAgentSignatureEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function markDirty() {
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/agentes/${agentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responseDelaySeconds, emojiEnabled, agentSignatureEnabled }),
        }),
        fetch(`/api/agentes/${agentId}/pausar-ia`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsappAiPaused: readOnly, instagramAiPaused: readOnly }),
        }),
      ]);
      if (!res1.ok || !res2.ok) throw new Error();
      setSaved(true);
      router.refresh();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
      <div>
        <label className="text-sm text-gray-400 block mb-1">Tempo de delay das respostas (segundos)</label>
        <input
          type="number" min={0} max={60}
          value={responseDelaySeconds}
          onChange={e => { setResponseDelaySeconds(Math.min(60, Math.max(0, Number(e.target.value)))); markDirty(); }}
          className="w-32 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
        />
        <p className="text-xs text-gray-500 mt-1">O agente espera esse tempo antes de começar a responder, simulando alguém lendo e digitando — 0 = resposta instantânea.</p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer border-t border-gray-800 pt-4">
        <input type="checkbox" checked={readOnly} onChange={e => { setReadOnly(e.target.checked); markDirty(); }} className="w-4 h-4 mt-0.5" />
        <div>
          <span className="text-sm font-medium block">Modo somente leitura</span>
          <span className="text-xs text-gray-500">O agente para de responder automaticamente no WhatsApp e no Instagram — as mensagens continuam chegando e sendo salvas normalmente, só a resposta da IA fica pausada.</span>
        </div>
      </label>

      <label className="flex items-start gap-3 cursor-pointer border-t border-gray-800 pt-4">
        <input type="checkbox" checked={emojiEnabled} onChange={e => { setEmojiEnabled(e.target.checked); markDirty(); }} className="w-4 h-4 mt-0.5" />
        <div>
          <span className="text-sm font-medium block">Usar emojis</span>
          <span className="text-xs text-gray-500">Permite que o agente use emojis nas respostas, deixando o tom mais amigável e expressivo.</span>
        </div>
      </label>

      <label className="flex items-start gap-3 cursor-pointer border-t border-gray-800 pt-4">
        <input type="checkbox" checked={agentSignatureEnabled} onChange={e => { setAgentSignatureEnabled(e.target.checked); markDirty(); }} className="w-4 h-4 mt-0.5" />
        <div>
          <span className="text-sm font-medium block">Assinar nome do agente</span>
          <span className="text-xs text-gray-500">Cada resposta da IA termina com uma bolha extra assinada com o nome do agente, ex: "– Sofia".</span>
        </div>
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-medium">
          {saving ? "Salvando..." : "Salvar"}
        </button>
        {saved && <span className="text-sm text-green-400">Salvo!</span>}
      </div>
    </div>
  );
}
