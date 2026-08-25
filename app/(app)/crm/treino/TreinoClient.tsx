"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Plus, Pencil, Trash2, RefreshCw, X, CheckCircle2, AlertCircle, Settings2 } from "lucide-react";

type Turno = { role: "user" | "assistant"; content: string };
type Exemplo = { id: string; cenario: string; turnos: Turno[]; temEmbedding: boolean; createdByName: string | null };

const MAX_EXEMPLOS = 100;
const MAX_TURNOS = 20;

function novoTurno(role: Turno["role"]): Turno {
  return { role, content: "" };
}

function TurnoEditor({ turnos, onChange }: { turnos: Turno[]; onChange: (turnos: Turno[]) => void }) {
  function atualizar(i: number, patch: Partial<Turno>) {
    onChange(turnos.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function remover(i: number) {
    onChange(turnos.filter((_, idx) => idx !== i));
  }
  function adicionar(role: Turno["role"]) {
    if (turnos.length >= MAX_TURNOS) return;
    onChange([...turnos, novoTurno(role)]);
  }

  return (
    <div className="space-y-2">
      {turnos.map((t, i) => (
        <div key={i} className="flex gap-2 items-start">
          <select
            value={t.role}
            onChange={e => atualizar(i, { role: e.target.value as Turno["role"] })}
            className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-2 text-xs w-28 flex-shrink-0"
          >
            <option value="user">Cliente</option>
            <option value="assistant">Assistente</option>
          </select>
          <textarea
            value={t.content}
            onChange={e => atualizar(i, { content: e.target.value })}
            rows={2}
            maxLength={2000}
            placeholder={t.role === "user" ? "O que o cliente escreveu..." : "Como o agente respondeu..."}
            className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
          />
          <button onClick={() => remover(i)} title="Remover turno" className="text-gray-600 hover:text-red-400 p-1.5 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <button
          onClick={() => adicionar("user")}
          disabled={turnos.length >= MAX_TURNOS}
          className="text-xs text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700 disabled:opacity-40 rounded-lg px-2.5 py-1"
        >
          + Fala do cliente
        </button>
        <button
          onClick={() => adicionar("assistant")}
          disabled={turnos.length >= MAX_TURNOS}
          className="text-xs text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700 disabled:opacity-40 rounded-lg px-2.5 py-1"
        >
          + Resposta do agente
        </button>
      </div>
    </div>
  );
}

export function TreinoClient({
  agentId, isManager, exemplos, similaridadeMinima, maxExemplos,
}: {
  agentId: string;
  isManager: boolean;
  exemplos: Exemplo[];
  similaridadeMinima: number;
  maxExemplos: number;
}) {
  const router = useRouter();

  const [showNovo, setShowNovo] = useState(false);
  const [novoCenario, setNovoCenario] = useState("");
  const [novoTurnos, setNovoTurnos] = useState<Turno[]>([novoTurno("user"), novoTurno("assistant")]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editCenario, setEditCenario] = useState("");
  const [editTurnos, setEditTurnos] = useState<Turno[]>([]);

  const [reprocessandoId, setReprocessandoId] = useState<string | null>(null);

  const [showConfig, setShowConfig] = useState(false);
  const [limiar, setLimiar] = useState(String(similaridadeMinima));
  const [maxEx, setMaxEx] = useState(String(maxExemplos));
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  function turnosValidos(turnos: Turno[]) {
    return turnos.length > 0 && turnos.every(t => t.content.trim().length > 0);
  }

  async function handleCriar() {
    if (!novoCenario.trim() || !turnosValidos(novoTurnos)) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/treino`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cenario: novoCenario.trim(), turnos: novoTurnos.map(t => ({ role: t.role, content: t.content.trim() })) }),
      });
      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) { setErro(data.error ?? "Não foi possível salvar."); return; }
      setNovoCenario("");
      setNovoTurnos([novoTurno("user"), novoTurno("assistant")]);
      setShowNovo(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(exemplo: Exemplo) {
    setEditandoId(exemplo.id);
    setEditCenario(exemplo.cenario);
    setEditTurnos(exemplo.turnos);
    setErro("");
  }

  async function handleSalvarEdicao() {
    if (!editandoId || !editCenario.trim() || !turnosValidos(editTurnos)) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/treino/${editandoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cenario: editCenario.trim(), turnos: editTurnos.map(t => ({ role: t.role, content: t.content.trim() })) }),
      });
      if (res.ok) { setEditandoId(null); router.refresh(); }
      else { const data = await res.json().catch(() => ({} as { error?: string })); setErro(data.error ?? "Não foi possível salvar."); }
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(exemplo: Exemplo) {
    if (!confirm(`Excluir o exemplo "${exemplo.cenario}"? A IA deixa de usá-lo imediatamente.`)) return;
    await fetch(`/api/agentes/${agentId}/treino/${exemplo.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleReprocessar(exemplo: Exemplo) {
    setReprocessandoId(exemplo.id);
    try {
      const res = await fetch(`/api/agentes/${agentId}/treino/${exemplo.id}/reprocessar`, { method: "POST" });
      if (res.ok) router.refresh();
      else setErro("Não foi possível gerar o embedding agora. Tente de novo em instantes.");
    } finally {
      setReprocessandoId(null);
    }
  }

  async function handleSalvarConfig() {
    const limiarNum = Number(limiar.replace(",", "."));
    const maxExNum = Number(maxEx);
    if (Number.isNaN(limiarNum) || limiarNum < 0 || limiarNum > 1) { setErro("Limiar de similaridade precisa estar entre 0 e 1."); return; }
    if (!Number.isInteger(maxExNum) || maxExNum < 0 || maxExNum > 10) { setErro("Máximo de exemplos precisa ser um número inteiro entre 0 e 10."); return; }
    setSalvandoConfig(true);
    setErro("");
    try {
      const res = await fetch(`/api/agentes/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treinoSimilaridadeMinima: limiarNum, treinoMaxExemplos: maxExNum }),
      });
      if (res.ok) { setShowConfig(false); router.refresh(); }
      else setErro("Não foi possível salvar as configurações.");
    } finally {
      setSalvandoConfig(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-gray-400 text-sm">Configurações</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <GraduationCap size={26} className="text-blue-400" /> Treino da IA
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Cadastre exemplos de atendimentos reais — um cenário curto e a conversa simulada.
              Quando um cliente escrever algo parecido, a IA usa o exemplo mais similar como referência
              pra responder, sem precisar reescrever as instruções do agente.
            </p>
          </div>
          {isManager && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowConfig(s => !s)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-2 transition-colors"
              >
                <Settings2 size={14} /> Ajustes
              </button>
              {exemplos.length < MAX_EXEMPLOS && (
                <button
                  onClick={() => setShowNovo(s => !s)}
                  className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 transition-colors"
                >
                  <Plus size={14} /> Novo exemplo
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600">
          {exemplos.length} de {MAX_EXEMPLOS} exemplos · até {MAX_TURNOS} turnos cada · a IA usa no máximo{" "}
          {maxExemplos} exemplo{maxExemplos === 1 ? "" : "s"} por resposta, só quando a similaridade passa de{" "}
          {similaridadeMinima.toFixed(2).replace(".", ",")}.
        </p>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        {showConfig && isManager && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold">Ajustes de retrieval</p>
            <div className="flex gap-4 flex-wrap">
              <label className="text-xs text-gray-400 space-y-1">
                <span className="block">Limiar mínimo de similaridade (0 a 1)</span>
                <input
                  value={limiar}
                  onChange={e => setLimiar(e.target.value)}
                  className="w-32 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-gray-400 space-y-1">
                <span className="block">Máximo de exemplos por resposta</span>
                <input
                  value={maxEx}
                  onChange={e => setMaxEx(e.target.value)}
                  className="w-32 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSalvarConfig}
                disabled={salvandoConfig}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                {salvandoConfig ? "Salvando..." : "Salvar"}
              </button>
              <button onClick={() => setShowConfig(false)} className="text-xs text-gray-400 hover:text-gray-200 px-2">Cancelar</button>
            </div>
          </div>
        )}

        {showNovo && isManager && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
            <input
              value={novoCenario}
              onChange={e => setNovoCenario(e.target.value)}
              placeholder="Cenário (ex: cliente pede foto do produto)"
              maxLength={120}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
            />
            <TurnoEditor turnos={novoTurnos} onChange={setNovoTurnos} />
            <div className="flex gap-2">
              <button
                onClick={handleCriar}
                disabled={salvando || !novoCenario.trim() || !turnosValidos(novoTurnos)}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button onClick={() => setShowNovo(false)} className="text-xs text-gray-400 hover:text-gray-200 px-2">Cancelar</button>
            </div>
          </div>
        )}

        {exemplos.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center space-y-2">
            <GraduationCap size={36} className="mx-auto text-gray-600" />
            <p className="text-sm text-gray-500">
              {isManager ? "Nenhum exemplo ainda. Cadastre o primeiro atendimento simulado — a IA passa a usá-lo como referência em conversas parecidas." : "O gestor ainda não cadastrou exemplos de treino."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {exemplos.map(exemplo => (
              <div key={exemplo.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                {editandoId === exemplo.id ? (
                  <div className="space-y-3">
                    <input
                      value={editCenario}
                      onChange={e => setEditCenario(e.target.value)}
                      maxLength={120}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                    />
                    <TurnoEditor turnos={editTurnos} onChange={setEditTurnos} />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSalvarEdicao}
                        disabled={salvando || !editCenario.trim() || !turnosValidos(editTurnos)}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium"
                      >
                        {salvando ? "Salvando..." : "Salvar"}
                      </button>
                      <button onClick={() => setEditandoId(null)} className="text-xs text-gray-400 hover:text-gray-200 px-2">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-sm font-semibold truncate">{exemplo.cenario}</p>
                      {exemplo.temEmbedding ? (
                        <span title="Pronto pra ser usado pela IA" className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-900 flex-shrink-0">
                          <CheckCircle2 size={11} /> Pronto
                        </span>
                      ) : (
                        <button
                          onClick={() => handleReprocessar(exemplo)}
                          disabled={reprocessandoId === exemplo.id}
                          title="Ainda sem embedding — a IA não usa esse exemplo até reprocessar"
                          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-900 hover:border-amber-700 disabled:opacity-50 flex-shrink-0"
                        >
                          <RefreshCw size={11} className={reprocessandoId === exemplo.id ? "animate-spin" : ""} />
                          {reprocessandoId === exemplo.id ? "Processando..." : "Reprocessar"}
                        </button>
                      )}
                      {isManager && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => iniciarEdicao(exemplo)} title="Editar" className="text-gray-500 hover:text-white p-1">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleExcluir(exemplo)} title="Excluir" className="text-gray-500 hover:text-red-400 p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {exemplo.turnos.map((t, i) => (
                        <p key={i} className="text-xs text-gray-400">
                          <span className={`font-semibold ${t.role === "user" ? "text-gray-300" : "text-blue-400"}`}>
                            {t.role === "user" ? "Cliente: " : "Assistente: "}
                          </span>
                          {t.content}
                        </p>
                      ))}
                    </div>
                    {exemplo.createdByName && (
                      <p className="text-[10px] text-gray-600 mt-2">cadastrado por {exemplo.createdByName}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {!isManager && (
          <p className="text-xs text-gray-600 flex items-center gap-1.5">
            <AlertCircle size={12} /> Só o gestor edita os exemplos de treino.
          </p>
        )}
      </div>
    </div>
  );
}
