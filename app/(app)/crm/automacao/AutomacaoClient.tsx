"use client";

import { useEffect, useState } from "react";
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, MessageSquareText, ArrowRight, KanbanSquare, X } from "lucide-react";

type Automacao = {
  id: string;
  nome: string;
  active: boolean;
  quickReplyId: string;
  targetStageId: string;
  quickReply: { title: string; content: string };
  targetStage: { name: string; color: string; pipeline: { name: string } };
};

type QuickReply = { id: string; title: string; content: string };
type Pipeline = { id: string; name: string; stages: { id: string; name: string; color: string }[] };

export function AutomacaoClient({ agentId }: { agentId: string }) {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [quickReplyId, setQuickReplyId] = useState("");
  const [targetStageId, setTargetStageId] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    try {
      const [a, q, p] = await Promise.all([
        fetch(`/api/agentes/${agentId}/automacoes`).then(r => r.json()),
        fetch(`/api/agentes/${agentId}/respostas-rapidas`).then(r => r.json()),
        fetch(`/api/agentes/${agentId}/pipelines`).then(r => r.json()),
      ]);
      setAutomacoes(a.automacoes ?? []);
      setQuickReplies(q.quickReplies ?? []);
      setPipelines(p.pipelines ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!nome.trim() || !quickReplyId || !targetStageId) {
      setError("Preencha nome, mensagem rápida e etapa.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/automacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), quickReplyId, targetStageId }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Erro ao criar automação."); }
      setNome(""); setQuickReplyId(""); setTargetStageId(""); setShowForm(false);
      loadAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(a: Automacao) {
    setAutomacoes(prev => prev.map(x => x.id === a.id ? { ...x, active: !x.active } : x));
    await fetch(`/api/agentes/${agentId}/automacoes/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !a.active }),
    });
  }

  async function handleDelete(a: Automacao) {
    if (!confirm(`Excluir a automação "${a.nome}"?`)) return;
    await fetch(`/api/agentes/${agentId}/automacoes/${a.id}`, { method: "DELETE" });
    loadAll();
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-gray-400 text-sm">Atendimento</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <Zap size={26} className="text-blue-400" /> Automação
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Regras determinísticas do pipeline, sem IA: a mensagem rápida enviada move o lead para a etapa configurada.
            </p>
          </div>
          <button
            onClick={() => { setShowForm(s => !s); setError(""); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            <Plus size={15} /> Nova automação
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm rounded-xl px-4 py-3 flex items-start justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError("")} className="flex-shrink-0 text-red-400 hover:text-red-200"><X size={14} /></button>
          </div>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-blue-800/40 rounded-2xl p-5 space-y-4">
            <p className="font-semibold text-sm">Nova automação</p>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Nome da automação</label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Enviou proposta → etapa Proposta"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                maxLength={60}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Quando a mensagem rápida for enviada...</label>
                <select
                  value={quickReplyId}
                  onChange={e => setQuickReplyId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Selecione a mensagem rápida...</option>
                  {quickReplies.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                </select>
                {quickReplies.length === 0 && !loading && (
                  <p className="text-xs text-amber-400 mt-1">Nenhuma resposta rápida cadastrada — crie uma no chat (ícone de raio) primeiro.</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">...mover o lead para a etapa</label>
                <select
                  value={targetStageId}
                  onChange={e => setTargetStageId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Selecione a etapa...</option>
                  {pipelines.map(p => (
                    <optgroup key={p.id} label={p.name}>
                      {p.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium">
                {saving ? "Criando..." : "Criar automação"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2">Cancelar</button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-2">
          {loading && <p className="text-sm text-gray-500 text-center py-8">Carregando...</p>}
          {!loading && automacoes.length === 0 && (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center">
              <Zap size={36} className="mx-auto text-gray-600 mb-3" />
              <p className="font-medium text-gray-400">Nenhuma automação ainda</p>
              <p className="text-sm text-gray-600 mt-1">Crie a primeira: uma mensagem rápida enviada move o lead de etapa automaticamente.</p>
            </div>
          )}
          {automacoes.map(a => (
            <div key={a.id} className={`bg-gray-900 border rounded-2xl p-4 flex items-center gap-3 flex-wrap ${a.active ? "border-gray-800" : "border-gray-800 opacity-50"}`}>
              <div className="flex-1 min-w-[220px]">
                <p className="text-sm font-semibold">{a.nome}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1 bg-gray-950 border border-gray-800 rounded-full px-2 py-0.5">
                    <MessageSquareText size={10} className="text-blue-400" /> {a.quickReply.title}
                  </span>
                  <ArrowRight size={12} className="text-gray-600 flex-shrink-0" />
                  <span className="flex items-center gap-1 bg-gray-950 border border-gray-800 rounded-full px-2 py-0.5">
                    <KanbanSquare size={10} style={{ color: a.targetStage.color }} />
                    {a.targetStage.name} <span className="text-gray-600">· {a.targetStage.pipeline.name}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(a)}
                  title={a.active ? "Desativar" : "Ativar"}
                  className={a.active ? "text-blue-400 hover:text-blue-300" : "text-gray-600 hover:text-gray-400"}
                >
                  {a.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <button onClick={() => handleDelete(a)} className="text-gray-600 hover:text-red-400">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-600">
          Como funciona: ao enviar a mensagem rápida no chat (ícone de raio) sem alterar o texto, o lead move para a etapa configurada e uma nota interna registra a automação. Se o texto for editado antes de enviar, a automação não dispara.
        </p>
      </div>
    </div>
  );
}
