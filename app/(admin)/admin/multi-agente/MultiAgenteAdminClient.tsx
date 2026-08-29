"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, ChevronDown, Pencil, Plus, Check, X, Loader2, CircleCheck, CircleDashed } from "lucide-react";

type Departamento = {
  id: string;
  nome: string;
  descricao: string;
  agenteInstrucoes: string;
};

type Agente = { id: string; active: boolean } | null;

export function MultiAgenteAdminClient({
  initialDepartamentos,
  initialAgente,
}: {
  initialDepartamentos: Departamento[];
  initialAgente: Agente;
}) {
  const [departamentos, setDepartamentos] = useState<Departamento[]>(initialDepartamentos);
  const [agente, setAgente] = useState<Agente>(initialAgente);
  const [criandoAgente, setCriandoAgente] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ nome: "", descricao: "", agenteInstrucoes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [criandoNovo, setCriandoNovo] = useState(false);
  const [novoDraft, setNovoDraft] = useState({ nome: "", descricao: "", agenteInstrucoes: "" });
  const [novoError, setNovoError] = useState("");

  function toggleOpen(id: string) {
    setOpenId(prev => (prev === id ? null : id));
    if (editingId && editingId !== id) { setEditingId(null); setError(""); }
  }

  function startEdit(d: Departamento) {
    setEditingId(d.id);
    setOpenId(d.id);
    setDraft({ nome: d.nome, descricao: d.descricao, agenteInstrucoes: d.agenteInstrucoes });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setError("");
  }

  async function handleSave(id: string) {
    setError("");
    if (!draft.nome.trim()) { setError("Informe o nome do setor."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/multi-agente/departamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao salvar."); return; }
      setDepartamentos(prev => prev.map(d => (d.id === id ? { ...d, ...draft } : d)));
      setEditingId(null);
    } catch {
      setError("Falha na conexão.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    setNovoError("");
    if (!novoDraft.nome.trim()) { setNovoError("Informe o nome do setor."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/multi-agente/departamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoDraft),
      });
      const data = await res.json();
      if (!res.ok) { setNovoError(data.error ?? "Erro ao criar."); return; }
      setDepartamentos(prev => [...prev, data.departamento]);
      setCriandoNovo(false);
      setNovoDraft({ nome: "", descricao: "", agenteInstrucoes: "" });
    } catch {
      setNovoError("Falha na conexão.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCriarAgente() {
    setCriandoAgente(true);
    try {
      const res = await fetch("/api/admin/multi-agente/agente", { method: "POST" });
      const data = await res.json();
      if (res.ok) setAgente(data.agente);
    } finally {
      setCriandoAgente(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bot size={24} className="text-blue-400" /> Agente multi-setor da FluxVenda</h1>
        <p className="text-gray-400 text-sm mt-1">
          O número de WhatsApp da própria plataforma (o mesmo que manda boas-vindas, OTP e o funil de trial) atendendo de verdade, como um agente de IA por setor.
          A conversa entra pelo SDR e a própria IA troca de setor sozinha conforme o assunto — sem precisar de um humano, a não ser em casos que realmente precisam.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        {agente ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {agente.active ? <CircleCheck size={18} className="text-green-400" /> : <CircleDashed size={18} className="text-amber-400" />}
              <div>
                <p className="font-semibold">{agente.active ? "Agente ativo" : "Agente criado — falta ativar"}</p>
                <p className="text-xs text-gray-500">
                  {agente.active ? "Já está respondendo pelo WhatsApp da plataforma." : "Conecte/ative pela tela normal do CRM pra começar a responder."}
                </p>
              </div>
            </div>
            <Link href={`/crm/${agente.id}/canais`} className="text-sm text-blue-400 hover:text-blue-300 font-medium">
              Abrir no CRM →
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold">Agente ainda não criado</p>
              <p className="text-xs text-gray-500">Cria o AgentConfig ligado ao WhatsApp da plataforma, desativado até você confirmar no CRM.</p>
            </div>
            <button onClick={handleCriarAgente} disabled={criandoAgente} className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5">
              {criandoAgente ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
              {criandoAgente ? "Criando..." : "Criar agente"}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Setores (personas de IA)</h2>
        {!criandoNovo && (
          <button onClick={() => setCriandoNovo(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus size={13} /> Novo setor</button>
        )}
      </div>

      {criandoNovo && (
        <div className="bg-gray-900 border border-blue-800/50 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Novo setor</p>
            <button onClick={() => { setCriandoNovo(false); setNovoError(""); }} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
          </div>
          <input value={novoDraft.nome} onChange={e => setNovoDraft(d => ({ ...d, nome: e.target.value }))} placeholder="Nome (ex: Financeiro)" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
          <input value={novoDraft.descricao} onChange={e => setNovoDraft(d => ({ ...d, descricao: e.target.value }))} placeholder="Descrição curta (o que esse setor atende)" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
          <textarea value={novoDraft.agenteInstrucoes} onChange={e => setNovoDraft(d => ({ ...d, agenteInstrucoes: e.target.value }))} placeholder="Instrução da IA quando estiver atuando como esse setor" rows={4} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm font-mono resize-y" />
          {novoError && <p className="text-sm text-red-400">{novoError}</p>}
          <button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Criar setor
          </button>
        </div>
      )}

      <div className="space-y-2">
        {departamentos.map(d => {
          const aberto = openId === d.id;
          return (
            <div key={d.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <button onClick={() => toggleOpen(d.id)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-800/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-bold">{d.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{d.descricao || "Sem descrição"}</p>
                </div>
                <ChevronDown size={18} className={`text-gray-500 flex-shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
              </button>

              {aberto && (
                <div className="px-5 pb-5 space-y-3 border-t border-gray-800 pt-4">
                  {editingId === d.id ? (
                    <div className="space-y-2">
                      <input value={draft.nome} onChange={e => setDraft(v => ({ ...v, nome: e.target.value }))} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
                      <input value={draft.descricao} onChange={e => setDraft(v => ({ ...v, descricao: e.target.value }))} placeholder="Descrição curta" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
                      <textarea value={draft.agenteInstrucoes} onChange={e => setDraft(v => ({ ...v, agenteInstrucoes: e.target.value }))} rows={6} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm font-mono resize-y" />
                      {error && <p className="text-sm text-red-400">{error}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(d.id)} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5">
                          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          {saving ? "Salvando..." : "Salvar"}
                        </button>
                        <button onClick={cancelEdit} className="text-sm text-gray-400 hover:text-white px-3 flex items-center gap-1"><X size={14} /> Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-gray-500 flex-1">Instrução da IA pra esse setor:</p>
                        <button onClick={() => startEdit(d)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 flex-shrink-0"><Pencil size={12} /> Editar</button>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 font-sans">
                        {d.agenteInstrucoes || "Sem instrução definida ainda — a IA vai usar só o comportamento geral."}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {departamentos.length === 0 && !criandoNovo && (
          <p className="text-sm text-gray-500">Nenhum setor cadastrado ainda. Clique em "Novo setor" pra criar o primeiro (ex: SDR).</p>
        )}
      </div>
    </div>
  );
}
