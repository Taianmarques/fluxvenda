"use client";

import { useState } from "react";
import { Goal, Save, Check } from "lucide-react";

type Attendant = { id: string; name: string };

export function MetasClient({ agentId, initialMetaGeralMensal, initialMetasPorVendedor, attendants }: {
  agentId: string;
  initialMetaGeralMensal: number;
  initialMetasPorVendedor: Record<string, number>;
  attendants: Attendant[];
}) {
  const [metaGeral, setMetaGeral] = useState(String(initialMetaGeralMensal || ""));
  const [metasPorVendedor, setMetasPorVendedor] = useState<Record<string, string>>(
    Object.fromEntries(attendants.map(a => [a.id, String(initialMetasPorVendedor?.[a.id] || "")]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateVendedor(id: string, value: string) {
    setMetasPorVendedor(prev => ({ ...prev, [id]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const parsedPorVendedor = Object.fromEntries(
        Object.entries(metasPorVendedor).map(([id, v]) => [id, Math.max(0, Number(v.replace(",", ".")) || 0)])
      );
      await fetch(`/api/agentes/${agentId}/metas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaGeralMensal: Math.max(0, Number(metaGeral.replace(",", ".")) || 0),
          metasPorVendedor: parsedPorVendedor,
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <p className="text-gray-400 text-sm">Configurações</p>
          <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><Goal size={28} className="text-blue-400" /> Metas</h1>
          <p className="text-gray-400 mt-1">Metas mensais de vendas — reiniciam todo mês, comparadas ao valor ganho no mês corrente nos dashboards.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <p className="font-semibold">Meta geral da equipe</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={metaGeral}
              onChange={e => { setMetaGeral(e.target.value); setSaved(false); }}
              placeholder="0,00"
              className="w-40 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
            <span className="text-xs text-gray-500">por mês</span>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <p className="font-semibold">Meta por vendedor</p>
          {attendants.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum membro na equipe ainda.</p>
          ) : (
            <div className="space-y-2">
              {attendants.map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <p className="w-40 text-sm text-gray-300 truncate flex-shrink-0">{a.name}</p>
                  <span className="text-sm text-gray-500">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={metasPorVendedor[a.id] ?? ""}
                    onChange={e => updateVendedor(a.id, e.target.value)}
                    placeholder="0,00"
                    className="w-40 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium"
          >
            <Save size={15} />
            {saving ? "Salvando..." : "Salvar"}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-400"><Check size={14} /> Salvo</span>
          )}
        </div>
      </div>
    </div>
  );
}
