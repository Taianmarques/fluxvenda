"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, Plus, Pencil, Trash2 } from "lucide-react";

type QuickReply = { id: string; title: string; content: string };

const MAX_TITULO = 40;
const MAX_CONTEUDO = 2000;

export function MensagensRapidasClient({ agentId, quickReplies }: { agentId: string; quickReplies: QuickReply[] }) {
  const router = useRouter();

  const [showNovo, setShowNovo] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoConteudo, setNovoConteudo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editConteudo, setEditConteudo] = useState("");

  async function handleCriar() {
    if (!novoTitulo.trim() || !novoConteudo.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/respostas-rapidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: novoTitulo.trim(), content: novoConteudo.trim() }),
      });
      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) { setErro(data.error ?? "Não foi possível salvar."); return; }
      setNovoTitulo("");
      setNovoConteudo("");
      setShowNovo(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(qr: QuickReply) {
    setEditandoId(qr.id);
    setEditTitulo(qr.title);
    setEditConteudo(qr.content);
    setErro("");
  }

  async function handleSalvarEdicao() {
    if (!editandoId || !editTitulo.trim() || !editConteudo.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/ferramentas/whatsapp/respostas-rapidas/${editandoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitulo.trim(), content: editConteudo.trim() }),
      });
      if (res.ok) { setEditandoId(null); router.refresh(); }
      else { const data = await res.json().catch(() => ({} as { error?: string })); setErro(data.error ?? "Não foi possível salvar."); }
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(qr: QuickReply) {
    if (!confirm(`Excluir a resposta rápida "${qr.title}"?`)) return;
    await fetch(`/api/ferramentas/whatsapp/respostas-rapidas/${qr.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-gray-400 text-sm">Configurações</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <MessageSquareText size={26} className="text-blue-400" /> Mensagens rápidas
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Textos prontos que qualquer atendente pode inserir rápido no chat (saudações, respostas padrão).
              Compartilhadas por toda a equipe.
            </p>
          </div>
          <button
            onClick={() => setShowNovo(s => !s)}
            className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 transition-colors flex-shrink-0"
          >
            <Plus size={14} /> Nova mensagem
          </button>
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        {showNovo && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
            <input
              value={novoTitulo}
              onChange={e => setNovoTitulo(e.target.value)}
              placeholder="Nome (ex: Saudação, Horário de funcionamento...)"
              maxLength={MAX_TITULO}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
            />
            <textarea
              value={novoConteudo}
              onChange={e => setNovoConteudo(e.target.value)}
              rows={4}
              maxLength={MAX_CONTEUDO}
              placeholder="Texto da resposta..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handleCriar}
                  disabled={salvando || !novoTitulo.trim() || !novoConteudo.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={() => setShowNovo(false)} className="text-xs text-gray-400 hover:text-gray-200 px-2">Cancelar</button>
              </div>
              <span className="text-[10px] text-gray-600">{novoConteudo.length}/{MAX_CONTEUDO}</span>
            </div>
          </div>
        )}

        {quickReplies.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center space-y-2">
            <MessageSquareText size={36} className="mx-auto text-gray-600" />
            <p className="text-sm text-gray-500">Nenhuma mensagem rápida ainda. Adicione a primeira — saudação, horário, política de troca...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quickReplies.map(qr => (
              <div key={qr.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                {editandoId === qr.id ? (
                  <div className="space-y-2">
                    <input
                      value={editTitulo}
                      onChange={e => setEditTitulo(e.target.value)}
                      maxLength={MAX_TITULO}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editConteudo}
                      onChange={e => setEditConteudo(e.target.value)}
                      rows={4}
                      maxLength={MAX_CONTEUDO}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button
                          onClick={handleSalvarEdicao}
                          disabled={salvando || !editTitulo.trim() || !editConteudo.trim()}
                          className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium"
                        >
                          {salvando ? "Salvando..." : "Salvar"}
                        </button>
                        <button onClick={() => setEditandoId(null)} className="text-xs text-gray-400 hover:text-gray-200 px-2">Cancelar</button>
                      </div>
                      <span className="text-[10px] text-gray-600">{editConteudo.length}/{MAX_CONTEUDO}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{qr.title}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 whitespace-pre-wrap">{qr.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => iniciarEdicao(qr)} title="Editar" className="text-gray-500 hover:text-white p-1">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleExcluir(qr)} title="Excluir" className="text-gray-500 hover:text-red-400 p-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
