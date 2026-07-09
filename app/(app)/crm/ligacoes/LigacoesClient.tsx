"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneOutgoing, PhoneIncoming, PhoneMissed, PhoneOff, Clock, ChevronDown, ChevronUp, Plus, X } from "lucide-react";

type PhoneCallTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type PhoneCall = {
  id: string;
  createdAt: string;
  direction: "INBOUND" | "OUTBOUND";
  contactNumber: string;
  contactName: string;
  status: "EM_ANDAMENTO" | "CONCLUIDA" | "PERDIDA" | "FALHADA";
  durationSecs: number | null;
  turns: PhoneCallTurn[];
};

const STATUS_LABEL: Record<PhoneCall["status"], string> = {
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  PERDIDA: "Não atendida",
  FALHADA: "Falha",
};

const STATUS_COLOR: Record<PhoneCall["status"], string> = {
  EM_ANDAMENTO: "text-yellow-400 bg-yellow-500/10 border-yellow-700/40",
  CONCLUIDA: "text-green-400 bg-green-500/10 border-green-700/40",
  PERDIDA: "text-orange-400 bg-orange-500/10 border-orange-700/40",
  FALHADA: "text-red-400 bg-red-500/10 border-red-700/40",
};

function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function DirectionIcon({ direction, status }: { direction: PhoneCall["direction"]; status: PhoneCall["status"] }) {
  if (status === "PERDIDA") return <PhoneMissed size={16} className="text-orange-400" />;
  if (status === "FALHADA") return <PhoneOff size={16} className="text-red-400" />;
  if (direction === "OUTBOUND") return <PhoneOutgoing size={16} className="text-blue-400" />;
  return <PhoneIncoming size={16} className="text-green-400" />;
}

function CallCard({ call }: { call: PhoneCall }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-800/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
          <DirectionIcon direction={call.direction} status={call.status} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{call.contactName || call.contactNumber}</p>
          {call.contactName && <p className="text-xs text-gray-500">{call.contactNumber}</p>}
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDuration(call.durationSecs)}
          </span>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLOR[call.status]}`}>
          {STATUS_LABEL[call.status]}
        </span>
        <span className="text-xs text-gray-500 hidden md:block whitespace-nowrap">{formatDate(call.createdAt)}</span>
        {call.turns.length > 0 && (open ? <ChevronUp size={15} className="text-gray-500 flex-shrink-0" /> : <ChevronDown size={15} className="text-gray-500 flex-shrink-0" />)}
      </button>

      {open && call.turns.length > 0 && (
        <div className="border-t border-gray-800 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Transcrição</p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {call.turns.map(turn => (
              <div key={turn.id} className={`flex gap-2 ${turn.role === "assistant" ? "justify-start" : "justify-end"}`}>
                <div className={`rounded-xl px-3 py-2 text-sm max-w-[80%] ${
                  turn.role === "assistant"
                    ? "bg-blue-500/10 border border-blue-700/30 text-blue-100"
                    : "bg-gray-800 text-gray-200"
                }`}>
                  <p className="text-[10px] font-semibold mb-0.5 opacity-60">
                    {turn.role === "assistant" ? "Agente" : "Cliente"}
                  </p>
                  {turn.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NovaLigacaoModal({
  agentId,
  onClose,
  onDone,
}: {
  agentId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCall() {
    if (!number.trim()) { setError("Informe o número"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/ligacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactNumber: number.trim(), contactName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao iniciar chamada");
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Nova ligação</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Número *</label>
            <input
              type="tel"
              placeholder="+5511999999999"
              value={number}
              onChange={e => setNumber(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Nome do contato (opcional)</label>
            <input
              type="text"
              placeholder="Ex: João Silva"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={handleCall}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          <Phone size={16} />
          {loading ? "Iniciando..." : "Ligar agora"}
        </button>
      </div>
    </div>
  );
}

export function LigacoesClient({ agentId }: { agentId: string }) {
  const [calls, setCalls] = useState<PhoneCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch(`/api/agentes/${agentId}/ligacoes`);
      if (res.ok) setCalls(await res.json());
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  // Polling para atualizar chamadas em andamento
  useEffect(() => {
    const hasActive = calls.some(c => c.status === "EM_ANDAMENTO");
    if (!hasActive) return;
    const interval = setInterval(fetchCalls, 5000);
    return () => clearInterval(interval);
  }, [calls, fetchCalls]);

  return (
    <div className="h-full bg-gray-950 text-white overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Agente de ligação</p>
            <h1 className="text-2xl font-bold mt-0.5">Ligações</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            Nova ligação
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Carregando...</div>
        ) : calls.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Phone size={40} className="mx-auto text-gray-700" />
            <p className="text-gray-500">Nenhuma ligação registrada ainda.</p>
            <p className="text-sm text-gray-600">
              Clique em "Nova ligação" para o agente ligar para um contato.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map(call => <CallCard key={call.id} call={call} />)}
          </div>
        )}
      </div>

      {showModal && (
        <NovaLigacaoModal
          agentId={agentId}
          onClose={() => setShowModal(false)}
          onDone={() => { setShowModal(false); fetchCalls(); }}
        />
      )}
    </div>
  );
}
