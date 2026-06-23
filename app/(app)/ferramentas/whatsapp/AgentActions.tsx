"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AgentActions({ active }: { active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function call(path: string) {
    setLoading(path);
    setError("");
    try {
      const res = await fetch(`/api/ferramentas/whatsapp/${path}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro");
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Erro ao executar ação");
    } finally {
      setLoading(null);
    }
  }

  function handleDesconectar() {
    if (!confirm("Desconectar o WhatsApp? O número vai sair do app e você vai precisar escanear o QR code de novo para reconectar.")) return;
    call("desconectar");
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {active ? (
          <button
            onClick={() => call("pausar")}
            disabled={loading !== null}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 disabled:opacity-50"
          >
            {loading === "pausar" ? "Pausando..." : "⏸ Pausar agente"}
          </button>
        ) : (
          <button
            onClick={() => call("ativar")}
            disabled={loading !== null}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white disabled:opacity-50"
          >
            {loading === "ativar" ? "Ativando..." : "▶ Reativar agente"}
          </button>
        )}
        <button
          onClick={handleDesconectar}
          disabled={loading !== null}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50 disabled:opacity-50"
        >
          {loading === "desconectar" ? "Desconectando..." : "🔌 Desconectar WhatsApp"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
