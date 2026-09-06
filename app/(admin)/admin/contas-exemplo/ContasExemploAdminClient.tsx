"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, Plus, Trash2, Loader2, ExternalLink } from "lucide-react";
import { SEGMENTS, SUBSEGMENTS } from "@/lib/segments";

type Conta = {
  teamId: string;
  name: string;
  segmento: string;
  subsegmento: string;
  createdAt: string;
  agentId: string | null;
};

export function ContasExemploAdminClient({ initialContas }: { initialContas: Conta[] }) {
  const [contas, setContas] = useState<Conta[]>(initialContas);
  const [segmento, setSegmento] = useState<string>(SEGMENTS[0]);
  const [subsegmento, setSubsegmento] = useState<string>(SUBSEGMENTS[SEGMENTS[0]][0]);
  const [criando, setCriando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleSegmentoChange(novo: string) {
    setSegmento(novo);
    setSubsegmento(SUBSEGMENTS[novo][0]);
  }

  async function handleCriar() {
    setCriando(true);
    setError("");
    try {
      const res = await fetch("/api/admin/contas-exemplo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmento, subsegmento }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao criar conta de exemplo."); return; }
      setContas(prev => [
        { teamId: data.teamId, name: `Exemplo — ${segmento} (${subsegmento})`, segmento, subsegmento, createdAt: new Date().toISOString(), agentId: data.agentId },
        ...prev,
      ]);
    } catch {
      setError("Falha na conexão.");
    } finally {
      setCriando(false);
    }
  }

  async function handleExcluir(conta: Conta) {
    if (!confirm(`Excluir a conta de exemplo "${conta.name}"? Isso apaga o pipeline e as conversas simuladas dela.`)) return;
    setExcluindoId(conta.teamId);
    try {
      const res = await fetch(`/api/admin/contas-exemplo/${conta.teamId}`, { method: "DELETE" });
      if (res.ok) setContas(prev => prev.filter(c => c.teamId !== conta.teamId));
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical size={24} className="text-blue-400" /> Contas de exemplo</h1>
        <p className="text-gray-400 text-sm mt-1">
          Gera uma equipe fictícia com pipeline padrão e uma conversa simulada por etapa do funil (escritas por IA, pro segmento escolhido) — útil pra demonstração comercial sem depender de dados de cliente real.
          Leva alguns segundos pra gerar; nenhuma mensagem sai de verdade (a conta não tem WhatsApp conectado).
        </p>
      </div>

      <div className="bg-gray-900 border border-blue-800/50 rounded-2xl p-5 space-y-3">
        <p className="font-semibold">Nova conta de exemplo</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Segmento</label>
            <select value={segmento} onChange={e => handleSegmentoChange(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm">
              {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Subsegmento</label>
            <select value={subsegmento} onChange={e => setSubsegmento(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm">
              {SUBSEGMENTS[segmento].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={handleCriar} disabled={criando} className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5">
          {criando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {criando ? "Gerando conversas simuladas..." : "Gerar conta de exemplo"}
        </button>
      </div>

      <div className="space-y-2">
        {contas.map(c => (
          <div key={c.teamId} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">{c.name}</p>
              <p className="text-xs text-gray-500">{c.segmento} · {c.subsegmento} · criada em {new Date(c.createdAt).toLocaleDateString("pt-BR")}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {c.agentId && (
                <Link href={`/crm/${c.agentId}`} target="_blank" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <ExternalLink size={12} /> Abrir no CRM
                </Link>
              )}
              <button onClick={() => handleExcluir(c)} disabled={excluindoId === c.teamId} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50">
                <Trash2 size={12} /> Excluir
              </button>
            </div>
          </div>
        ))}
        {contas.length === 0 && (
          <p className="text-sm text-gray-500">Nenhuma conta de exemplo criada ainda.</p>
        )}
      </div>
    </div>
  );
}
