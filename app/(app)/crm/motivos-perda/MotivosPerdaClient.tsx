"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsDown, Plus, Pencil, Trash2 } from "lucide-react";

type Motivo = { id: string; nome: string };

const MAX_NOME = 60;

export function MotivosPerdaClient({ agentId, isManager, motivos }: { agentId: string; isManager: boolean; motivos: Motivo[] }) {
  const router = useRouter();

  const [showNovo, setShowNovo] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");

  async function handleCriar() {
    if (!novoNome.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/motivos-perda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome.trim() }),
      });
      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) { setErro(data.error ?? "Não foi possível salvar."); return; }
      setNovoNome("");
      setShowNovo(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(m: Motivo) {
    setEditandoId(m.id);
    setEditNome(m.nome);
    setErro("");
  }

  async function handleSalvarEdicao() {
    if (!editandoId || !editNome.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/motivos-perda/${editandoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: editNome.trim() }),
      });
      if (res.ok) { setEditandoId(null); router.refresh(); }
      else { const data = await res.json().catch(() => ({} as { error?: string })); setErro(data.error ?? "Não foi possível salvar."); }
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(m: Motivo) {
    if (!confirm(`Excluir o motivo "${m.nome}"? Negociações que já usavam esse motivo ficam sem motivo.`)) return;
    await fetch(`/api/agentes/${agentId}/motivos-perda/${m.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-gray-400 text-sm">Configurações</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <ThumbsDown size={26} className="text-blue-400" /> Motivos de perda
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Lista de motivos que o atendente escolhe ao marcar uma negociação como perdida no pipeline.
              Vira relatório em vez de texto livre solto.
            </p>
          </div>
          {isManager && (
            <button
              onClick={() => setShowNovo(s => !s)}
              className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 transition-colors flex-shrink-0"
            >
              <Plus size={14} /> Novo motivo
            </button>
          )}
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        {showNovo && isManager && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
            <input
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              placeholder="Nome (ex: Preço, Escolheu concorrente, Sem resposta...)"
              maxLength={MAX_NOME}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCriar}
                disabled={salvando || !novoNome.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button onClick={() => setShowNovo(false)} className="text-xs text-gray-400 hover:text-gray-200 px-2">Cancelar</button>
            </div>
          </div>
        )}

        {motivos.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center space-y-2">
            <ThumbsDown size={36} className="mx-auto text-gray-600" />
            <p className="text-sm text-gray-500">
              {isManager ? "Nenhum motivo ainda. Adicione o primeiro — preço, prazo, concorrente..." : "O gestor ainda não cadastrou motivos de perda."}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {motivos.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5">
                {editandoId === m.id ? (
                  <>
                    <input
                      value={editNome}
                      onChange={e => setEditNome(e.target.value)}
                      maxLength={MAX_NOME}
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={handleSalvarEdicao}
                      disabled={salvando || !editNome.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium flex-shrink-0"
                    >
                      {salvando ? "Salvando..." : "Salvar"}
                    </button>
                    <button onClick={() => setEditandoId(null)} className="text-xs text-gray-400 hover:text-gray-200 px-2 flex-shrink-0">Cancelar</button>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-sm font-medium truncate">{m.nome}</p>
                    {isManager && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => iniciarEdicao(m)} title="Editar" className="text-gray-500 hover:text-white p-1">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleExcluir(m)} title="Excluir" className="text-gray-500 hover:text-red-400 p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
