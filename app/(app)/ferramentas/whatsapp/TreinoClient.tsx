"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Download, Lightbulb, X } from "lucide-react";

type Turno = { role: "user" | "assistant"; content: string };
type Exemplo = {
  id: string;
  cenario: string;
  turnos: Turno[];
  createdByName: string | null;
  createdAt: string;
};

const CENARIOS_SUGERIDOS = [
  "Cliente só quer saber o preço",
  "Cliente já chega com todas as medidas",
  "Cliente não sabe qual material/espessura usar",
  "Objeção de preço (\"está caro\", \"achei mais barato\")",
  "Cliente pede foto do produto",
  "Cliente pede corte e fitamento junto",
  "Medida com erro de digitação/formato confuso",
  "Cliente pergunta entrega x retirada na loja",
  "Cliente indeciso entre dois materiais",
  "Cliente com urgência (\"preciso pra hoje\")",
  "Perfil do cliente (marceneiro x consumidor final)",
  "Fechamento — avisar que o orçamento vem em instantes",
];

function novoTurnoPar(): Turno[] {
  return [
    { role: "user", content: "" },
    { role: "assistant", content: "" },
  ];
}

export function TreinoClient({ agentId, initialExemplos }: { agentId: string; initialExemplos: Exemplo[] }) {
  const router = useRouter();
  const [exemplos, setExemplos] = useState<Exemplo[]>(initialExemplos);
  const [editing, setEditing] = useState<{ id: string | null; cenario: string; turnos: Turno[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  function handleNovo(cenarioSugerido?: string) {
    setEditing({ id: null, cenario: cenarioSugerido ?? "", turnos: novoTurnoPar() });
    setShowSuggestions(false);
    setError("");
  }

  function handleEditar(ex: Exemplo) {
    setEditing({ id: ex.id, cenario: ex.cenario, turnos: ex.turnos.map(t => ({ ...t })) });
    setError("");
  }

  function addTurno() {
    if (!editing) return;
    const last = editing.turnos[editing.turnos.length - 1];
    const nextRole: "user" | "assistant" = last?.role === "user" ? "assistant" : "user";
    setEditing({ ...editing, turnos: [...editing.turnos, { role: nextRole, content: "" }] });
  }

  function removeTurno(i: number) {
    if (!editing || editing.turnos.length <= 2) return;
    setEditing({ ...editing, turnos: editing.turnos.filter((_, idx) => idx !== i) });
  }

  function updateTurno(i: number, content: string) {
    if (!editing) return;
    setEditing({ ...editing, turnos: editing.turnos.map((t, idx) => (idx === i ? { ...t, content } : t)) });
  }

  async function handleSalvar() {
    if (!editing) return;
    setError("");
    const cenario = editing.cenario.trim();
    if (!cenario) { setError("Dê um nome curto pro cenário."); return; }
    const turnos = editing.turnos.map(t => ({ ...t, content: t.content.trim() }));
    if (turnos.some(t => !t.content)) { setError("Preencha todas as falas antes de salvar."); return; }

    setSaving(true);
    try {
      const url = editing.id ? `/api/agentes/${agentId}/treino/${editing.id}` : `/api/agentes/${agentId}/treino`;
      const res = await fetch(url, {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cenario, turnos }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Não foi possível salvar."); return; }

      if (editing.id) {
        setExemplos(prev => prev.map(ex => (ex.id === editing.id ? { ...ex, cenario: data.exemplo.cenario, turnos: data.exemplo.turnos } : ex)));
      } else {
        setExemplos(prev => [
          { id: data.exemplo.id, cenario: data.exemplo.cenario, turnos: data.exemplo.turnos, createdByName: data.exemplo.createdBy?.name ?? null, createdAt: data.exemplo.createdAt },
          ...prev,
        ]);
      }
      setEditing(null);
      router.refresh();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir(id: string) {
    if (!window.confirm("Apagar essa conversa simulada?")) return;
    setExemplos(prev => prev.filter(ex => ex.id !== id));
    await fetch(`/api/agentes/${agentId}/treino/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleNovo()}
          className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          <Plus size={15} /> Nova conversa simulada
        </button>
        <button
          onClick={() => setShowSuggestions(s => !s)}
          className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1.5"
        >
          <Lightbulb size={14} /> Cenários sugeridos
        </button>
        {exemplos.length > 0 && (
          <a
            href={`/api/agentes/${agentId}/treino/exportar`}
            className="ml-auto text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1.5"
          >
            <Download size={14} /> Exportar .jsonl ({exemplos.length})
          </a>
        )}
      </div>

      {showSuggestions && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-2">Clique num cenário pra começar uma conversa nova com esse nome:</p>
          <div className="flex flex-wrap gap-2">
            {CENARIOS_SUGERIDOS.map(c => (
              <button
                key={c}
                onClick={() => handleNovo(c)}
                className="text-xs bg-gray-950 border border-gray-800 hover:border-blue-600 rounded-lg px-3 py-1.5 text-left"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <div className="bg-gray-900 border border-blue-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{editing.id ? "Editar conversa simulada" : "Nova conversa simulada"}</p>
            <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Cenário</label>
            <input
              value={editing.cenario}
              onChange={e => setEditing({ ...editing, cenario: e.target.value })}
              placeholder="Ex: Cliente pede foto do produto"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="space-y-2">
            {editing.turnos.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`text-[10px] font-bold uppercase w-16 flex-shrink-0 mt-2.5 ${t.role === "user" ? "text-amber-400" : "text-blue-400"}`}>
                  {t.role === "user" ? "Cliente" : "SDR"}
                </span>
                <textarea
                  value={t.content}
                  onChange={e => updateTurno(i, e.target.value)}
                  rows={2}
                  placeholder={t.role === "user" ? "O que o cliente diz..." : "A resposta ideal do SDR..."}
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600 resize-none"
                />
                {editing.turnos.length > 2 && (
                  <button onClick={() => removeTurno(i)} className="text-gray-600 hover:text-red-400 mt-2.5 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addTurno} className="text-sm text-blue-400 hover:text-blue-300">+ Adicionar fala</button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleSalvar} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-gray-200">Cancelar</button>
          </div>
        </div>
      )}

      {exemplos.length === 0 && !editing ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-500">Nenhuma conversa simulada ainda. Comece pelos cenários sugeridos acima.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exemplos.map(ex => (
            <div key={ex.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{ex.cenario}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ex.turnos.length} falas · {ex.createdByName ?? "—"} · {new Date(ex.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleEditar(ex)} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-black/20"><Pencil size={14} /></button>
                  <button onClick={() => handleExcluir(ex.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-black/20"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 border-t border-gray-800 pt-3">
                {ex.turnos.slice(0, 4).map((t, i) => (
                  <p key={i} className="text-xs text-gray-400 truncate">
                    <span className={`font-semibold ${t.role === "user" ? "text-amber-400" : "text-blue-400"}`}>
                      {t.role === "user" ? "Cliente: " : "SDR: "}
                    </span>
                    {t.content}
                  </p>
                ))}
                {ex.turnos.length > 4 && <p className="text-xs text-gray-600">+ {ex.turnos.length - 4} falas...</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
