"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export function MultiAgentePanel({ agentId, initialEnabled }: { agentId: string; initialEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ multiAgenteDepartamentos: enabled }),
      });
      if (!res.ok) throw new Error();
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
      <p className="text-sm text-gray-400">
        Em vez de um único comportamento pra tudo, a IA passa a assumir a persona de um setor específico (ex: SAC, RH, Financeiro) conforme o assunto da conversa — e troca de setor sozinha quando o assunto muda, sem precisar transferir pra um humano.
      </p>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => { setEnabled(e.target.checked); setSaved(false); }}
          className="w-4 h-4"
        />
        <span className="text-sm">Ativar modo multi-agente por setor</span>
      </label>

      {enabled && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-2">
          <p className="text-sm text-gray-300">
            Configure a instrução de IA de cada setor na tela de <b>Equipe → Departamentos</b> — o primeiro departamento que você cadastrar é o setor de entrada, onde toda conversa nova começa.
          </p>
          <Link href={`/crm/${agentId}/equipe`} className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
            Ir para Equipe <ArrowRight size={12} />
          </Link>
        </div>
      )}

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
