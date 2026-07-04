"use client";

import { useState, useEffect, useRef } from "react";
import {
  Wifi, Pause, Play, Plus, RefreshCw, X,
  CheckCircle2, Smartphone, Instagram, Link2Off,
  ChevronDown, ChevronUp, GripVertical, Trash2, ToggleLeft, ToggleRight,
} from "lucide-react";

type WhatsAppStatus = {
  connected: boolean;
  qrcode: string | null;
  paircode: string | null;
  profileName: string | null;
  ownerNumber: string | null;
};

type InstagramStatus = {
  username: string;
  businessAccountId: string;
} | null;

type CommentFlow = {
  id: string;          // cuid from DB, or "new_<timestamp>" for unsaved
  name: string;
  keywords: string[];
  replyMessage: string;
  order: number;
  active: boolean;
};

type Channel = {
  id: string;
  nome: string;
  segmento: string;
  subsegmento: string;
  active: boolean;
  uazapiToken: string | null;
  whatsapp: WhatsAppStatus | null;
  instagram: InstagramStatus;
  igCommentAutoDm: boolean;
  igCommentDmMessage: string | null;
  igCommentFlows: CommentFlow[];
};

function toImageSrc(qrcode: string) {
  return qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`;
}

function WaBadge({ ch }: { ch: Channel }) {
  if (!ch.uazapiToken) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">Sem instância</span>;
  if (!ch.whatsapp) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700 animate-pulse">Verificando...</span>;
  if (!ch.active) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">Pausado</span>;
  if (ch.whatsapp.connected) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-800/50">Ativo</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400 border border-yellow-800/50">Desconectado</span>;
}

// ─── Flow card ────────────────────────────────────────────────────────────────

function FlowCard({
  flow,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  flow: CommentFlow;
  index: number;
  total: number;
  onUpdate: (patch: Partial<CommentFlow>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [kwInput, setKwInput] = useState("");

  function addKw() {
    const kw = kwInput.trim().toLowerCase();
    if (!kw || flow.keywords.includes(kw)) return;
    onUpdate({ keywords: [...flow.keywords, kw] });
    setKwInput("");
  }

  function removeKw(kw: string) {
    onUpdate({ keywords: flow.keywords.filter((k) => k !== kw) });
  }

  return (
    <div className={`rounded-xl border ${flow.active ? "border-gray-700 bg-gray-900/60" : "border-gray-800 bg-gray-950/40 opacity-60"} overflow-hidden`}>
      {/* Header do card */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/60">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button onClick={onMoveUp} disabled={index === 0} className="text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors">
            <ChevronUp size={13} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors">
            <ChevronDown size={13} />
          </button>
        </div>

        <GripVertical size={14} className="text-gray-700 flex-shrink-0" />

        {/* Nome editável */}
        <input
          type="text"
          value={flow.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Nome da condição"
          className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-gray-600 min-w-0"
        />

        {/* Toggle ativo */}
        <button
          onClick={() => onUpdate({ active: !flow.active })}
          className={`flex-shrink-0 transition-colors ${flow.active ? "text-purple-400 hover:text-purple-300" : "text-gray-600 hover:text-gray-400"}`}
          title={flow.active ? "Desativar" : "Ativar"}
        >
          {flow.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
        </button>

        {/* Deletar */}
        <button
          onClick={onDelete}
          className="flex-shrink-0 text-gray-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Corpo do card */}
      <div className="px-3 py-3 space-y-3">
        {/* Keywords */}
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500 font-medium">
            Palavras-chave que ativam esta condição
            <span className="text-gray-600 font-normal ml-1">(vazio = qualquer comentário)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {flow.keywords.map((kw) => (
              <span key={kw} className="flex items-center gap-1 text-xs bg-purple-900/30 text-purple-300 border border-purple-800/40 rounded-full px-2 py-0.5">
                {kw}
                <button onClick={() => removeKw(kw)} className="hover:text-white"><X size={9} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKw(); } }}
              placeholder="Ex: info, preço, quero..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-600"
            />
            <button
              onClick={addKw}
              className="text-xs text-purple-400 hover:text-purple-300 border border-purple-800/50 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap"
            >
              + Adicionar
            </button>
          </div>
        </div>

        {/* Mensagem */}
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500 font-medium">Mensagem enviada no DM</p>
          <textarea
            value={flow.replyMessage}
            onChange={(e) => onUpdate({ replyMessage: e.target.value })}
            rows={2}
            placeholder="Olá! Vi seu comentário, posso te ajudar com mais detalhes no privado..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-purple-600 resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CanaisClient({
  initialChannels,
  isManager,
}: {
  initialChannels: Omit<Channel, "whatsapp">[];
  isManager: boolean;
}) {
  const [channels, setChannels] = useState<Channel[]>(
    initialChannels.map((c) => ({ ...c, whatsapp: null }))
  );
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<WhatsAppStatus | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSegmento, setNewSegmento] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [disconnectingIg, setDisconnectingIg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Painel de fluxos aberto
  const [openFlowsId, setOpenFlowsId] = useState<string | null>(null);

  // Estado local dos fluxos em edição (keyed by channelId)
  const [flowsState, setFlowsState] = useState<Record<string, {
    igCommentAutoDm: boolean;
    igCommentDmMessage: string;
    flows: CommentFlow[];
  }>>({});
  const [savingFlows, setSavingFlows] = useState<string | null>(null);

  function getFlowsState(ch: Channel) {
    return flowsState[ch.id] ?? {
      igCommentAutoDm: ch.igCommentAutoDm,
      igCommentDmMessage: ch.igCommentDmMessage ?? "",
      flows: ch.igCommentFlows.map((f) => ({ ...f })),
    };
  }

  function updateFlowsState(channelId: string, patch: Partial<ReturnType<typeof getFlowsState>>) {
    const ch = channels.find((c) => c.id === channelId)!;
    setFlowsState((prev) => ({
      ...prev,
      [channelId]: { ...getFlowsState(ch), ...prev[channelId], ...patch },
    }));
  }

  function updateFlow(channelId: string, flowId: string, patch: Partial<CommentFlow>) {
    const ch = channels.find((c) => c.id === channelId)!;
    const s = flowsState[channelId] ?? getFlowsState(ch);
    setFlowsState((prev) => ({
      ...prev,
      [channelId]: {
        ...s,
        ...prev[channelId],
        flows: (prev[channelId]?.flows ?? s.flows).map((f) => f.id === flowId ? { ...f, ...patch } : f),
      },
    }));
  }

  function deleteFlow(channelId: string, flowId: string) {
    const ch = channels.find((c) => c.id === channelId)!;
    const s = flowsState[channelId] ?? getFlowsState(ch);
    setFlowsState((prev) => ({
      ...prev,
      [channelId]: {
        ...s,
        ...prev[channelId],
        flows: (prev[channelId]?.flows ?? s.flows).filter((f) => f.id !== flowId),
      },
    }));
  }

  function moveFlow(channelId: string, fromIndex: number, toIndex: number) {
    const ch = channels.find((c) => c.id === channelId)!;
    const s = flowsState[channelId] ?? getFlowsState(ch);
    const currentFlows = [...(flowsState[channelId]?.flows ?? s.flows)];
    const [moved] = currentFlows.splice(fromIndex, 1);
    currentFlows.splice(toIndex, 0, moved);
    const reordered = currentFlows.map((f, i) => ({ ...f, order: i }));
    setFlowsState((prev) => ({
      ...prev,
      [channelId]: { ...s, ...prev[channelId], flows: reordered },
    }));
  }

  function addFlow(channelId: string) {
    const ch = channels.find((c) => c.id === channelId)!;
    const s = flowsState[channelId] ?? getFlowsState(ch);
    const currentFlows = flowsState[channelId]?.flows ?? s.flows;
    const newFlow: CommentFlow = {
      id: `new_${Date.now()}`,
      name: `Condição ${currentFlows.length + 1}`,
      keywords: [],
      replyMessage: "",
      order: currentFlows.length,
      active: true,
    };
    setFlowsState((prev) => ({
      ...prev,
      [channelId]: { ...s, ...prev[channelId], flows: [...currentFlows, newFlow] },
    }));
  }

  async function saveFlows(channelId: string) {
    const ch = channels.find((c) => c.id === channelId)!;
    const s = flowsState[channelId] ?? getFlowsState(ch);
    setSavingFlows(channelId);
    try {
      const res = await fetch(`/api/instagram/comment-flows/${channelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          igCommentAutoDm: s.igCommentAutoDm,
          igCommentDmMessage: s.igCommentDmMessage || null,
          flows: s.flows.map((f, i) => ({
            name: f.name,
            keywords: f.keywords,
            replyMessage: f.replyMessage,
            order: i,
            active: f.active,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      // Reflectir no estado do canal
      setChannels((prev) => prev.map((c) => c.id === channelId
        ? { ...c, igCommentAutoDm: s.igCommentAutoDm, igCommentDmMessage: s.igCommentDmMessage || null, igCommentFlows: s.flows }
        : c
      ));
    } catch {
      setError("Erro ao salvar condições.");
    } finally {
      setSavingFlows(null);
    }
  }

  // Busca status do WhatsApp de todos os canais ao montar
  useEffect(() => {
    channels.forEach(async (ch) => {
      if (!ch.uazapiToken) {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === ch.id
              ? { ...c, whatsapp: { connected: false, qrcode: null, paircode: null, profileName: null, ownerNumber: null } }
              : c
          )
        );
        return;
      }
      try {
        const res = await fetch(`/api/agentes/${ch.id}/conectar`);
        if (!res.ok) throw new Error();
        const data: WhatsAppStatus = await res.json();
        setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, whatsapp: data } : c)));
      } catch {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === ch.id
              ? { ...c, whatsapp: { connected: false, qrcode: null, paircode: null, profileName: null, ownerNumber: null } }
              : c
          )
        );
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listener do popup OAuth do Instagram
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const { type, agentId, username, businessAccountId, message } = event.data ?? {};
      if (type === "INSTAGRAM_CONNECTED") {
        setChannels((prev) =>
          prev.map((c) => (c.id === agentId ? { ...c, instagram: { username, businessAccountId } } : c))
        );
      }
      if (type === "INSTAGRAM_ERROR") {
        setError(message ?? "Erro ao conectar o Instagram.");
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function startConnect(channelId: string) {
    setConnectingId(channelId);
    setQrStatus(null);
    stopPoll();
    try {
      const res = await fetch(`/api/agentes/${channelId}/conectar`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data: WhatsAppStatus = await res.json();
      setQrStatus(data);
    } catch {
      setQrStatus({ connected: false, qrcode: null, paircode: null, profileName: null, ownerNumber: null });
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/agentes/${channelId}/conectar`);
        if (!res.ok) return;
        const data: WhatsAppStatus = await res.json();
        setQrStatus(data);
        if (data.connected) {
          stopPoll();
          setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, active: true, whatsapp: data } : c)));
          setTimeout(() => { setConnectingId(null); setQrStatus(null); }, 1800);
        }
      } catch {}
    }, 4000);
  }

  function closeModal() { stopPoll(); setConnectingId(null); setQrStatus(null); }

  async function handlePause(channelId: string) {
    setLoadingId(channelId + ":pause");
    try {
      await fetch(`/api/agentes/${channelId}/pausar`, { method: "POST" });
      setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, active: false } : c)));
    } finally { setLoadingId(null); }
  }

  async function handleActivate(channelId: string) {
    setLoadingId(channelId + ":activate");
    try {
      const res = await fetch(`/api/agentes/${channelId}/ativar`, { method: "POST" });
      if (res.ok) {
        setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, active: true } : c)));
      } else {
        const data = await res.json();
        setError(data.error ?? "Erro ao reativar");
      }
    } finally { setLoadingId(null); }
  }

  async function handleCreate(connect: "whatsapp" | "instagram" | "none") {
    if (!newName.trim()) return;
    setLoadingId("new");
    setError("");
    // Popup precisa abrir de forma síncrona no clique, senão o navegador bloqueia
    const igPopup = connect === "instagram" ? openInstagramPopup() : null;
    try {
      const res = await fetch("/api/agentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: newName.trim(), segmento: newSegmento.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newChannel: Channel = { ...data.config, whatsapp: null, instagram: null, igCommentFlows: [] };
      setChannels((prev) => [...prev, newChannel]);
      setCreating(false);
      setNewName("");
      setNewSegmento("");
      if (connect === "whatsapp") await startConnect(data.config.id);
      if (connect === "instagram" && igPopup) {
        igPopup.location.href = `/api/instagram/auth?agentId=${data.config.id}`;
      }
    } catch {
      igPopup?.close();
      setError("Erro ao criar canal. Tente novamente.");
    } finally { setLoadingId(null); }
  }

  function openInstagramPopup(url = "") {
    const w = 600, h = 700;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    return window.open(
      url,
      "instagram-oauth",
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
  }

  function openInstagramOAuth(agentId: string) {
    openInstagramPopup(`/api/instagram/auth?agentId=${agentId}`);
  }

  async function handleDeleteChannel(agentId: string) {
    setDeletingId(agentId);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao excluir o canal.");
      }
      setChannels((prev) => prev.filter((c) => c.id !== agentId));
      setConfirmDeleteId(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao excluir o canal.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDisconnectInstagram(agentId: string) {
    setDisconnectingIg(agentId);
    try {
      await fetch(`/api/instagram/disconnect/${agentId}`, { method: "DELETE" });
      setChannels((prev) => prev.map((c) => (c.id === agentId ? { ...c, instagram: null } : c)));
    } finally { setDisconnectingIg(null); }
  }

  const connectingChannel = channels.find((c) => c.id === connectingId);

  return (
    <div className="min-h-full p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wifi className="text-blue-400" size={24} />
            <div>
              <h1 className="text-2xl font-bold">Canais</h1>
              <p className="text-xs text-gray-500">WhatsApp e Instagram conectados ao agente</p>
            </div>
          </div>
          {isManager && (
            <button
              onClick={() => { setCreating(true); setError(""); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors"
            >
              <Plus size={16} />
              Novo agente
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm rounded-xl px-4 py-3 flex items-start justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError("")} className="flex-shrink-0 text-red-400 hover:text-red-200"><X size={14} /></button>
          </div>
        )}

        {/* Formulário de novo agente */}
        {creating && (
          <div className="bg-gray-900 border border-blue-800/40 rounded-2xl p-5 space-y-4">
            <p className="font-medium text-sm">Novo agente</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Nome</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Atendimento, Vendas..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Segmento (opcional)</label>
                <input
                  type="text"
                  value={newSegmento}
                  onChange={(e) => setNewSegmento(e.target.value)}
                  placeholder="Ex: SaaS, Clínica..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Escolha o canal para conectar agora (dá para conectar os outros depois):</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleCreate("whatsapp")}
                  disabled={!newName.trim() || loadingId === "new"}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-xl px-4 py-2 transition-colors"
                >
                  <Smartphone size={14} />
                  {loadingId === "new" ? "Criando..." : "Criar e conectar WhatsApp"}
                </button>
                <button
                  onClick={() => handleCreate("instagram")}
                  disabled={!newName.trim() || loadingId === "new"}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm rounded-xl px-4 py-2 transition-colors"
                >
                  <Instagram size={14} />
                  {loadingId === "new" ? "Criando..." : "Criar e conectar Instagram"}
                </button>
                <button
                  onClick={() => handleCreate("none")}
                  disabled={!newName.trim() || loadingId === "new"}
                  className="text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
                >
                  Criar sem conectar
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName(""); setNewSegmento(""); }}
                  className="text-sm text-gray-500 hover:text-gray-300 px-3 py-2 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de agentes/canais */}
        <div className="space-y-4">
          {channels.length === 0 && !creating && (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-12 text-center">
              <Smartphone size={40} className="mx-auto text-gray-600 mb-3" />
              <p className="font-medium text-gray-400">Nenhum agente configurado</p>
              <p className="text-sm text-gray-600 mt-1">Crie o primeiro agente para começar a atender</p>
            </div>
          )}

          {channels.map((ch) => {
            const fs = flowsState[ch.id] ?? {
              igCommentAutoDm: ch.igCommentAutoDm,
              igCommentDmMessage: ch.igCommentDmMessage ?? "",
              flows: ch.igCommentFlows,
            };
            const flowsOpen = openFlowsId === ch.id;

            return (
              <div key={ch.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {/* Nome do agente */}
                <div className="px-5 pt-4 pb-3 border-b border-gray-800/60 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{ch.nome}</p>
                    {(ch.segmento || ch.subsegmento) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[ch.segmento, ch.subsegmento].filter(Boolean).join(" › ")}
                      </p>
                    )}
                  </div>
                  {isManager && (
                    <button
                      onClick={() => setConfirmDeleteId(ch.id)}
                      className="flex-shrink-0 text-gray-600 hover:text-red-400 transition-colors p-1"
                      title="Excluir canal"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* WhatsApp */}
                <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap border-b border-gray-800/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Smartphone size={15} className="text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">WhatsApp</span>
                        <WaBadge ch={ch} />
                      </div>
                      {ch.whatsapp?.ownerNumber && (
                        <p className="text-xs text-gray-400 font-mono">+{ch.whatsapp.ownerNumber}</p>
                      )}
                      {ch.whatsapp?.profileName && (
                        <p className="text-xs text-gray-500">{ch.whatsapp.profileName}</p>
                      )}
                    </div>
                  </div>

                  {isManager && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ch.active ? (
                        <button
                          onClick={() => handlePause(ch.id)}
                          disabled={loadingId === ch.id + ":pause"}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          <Pause size={12} />
                          {loadingId === ch.id + ":pause" ? "..." : "Pausar"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(ch.id)}
                          disabled={loadingId === ch.id + ":activate"}
                          className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 border border-green-800/50 hover:border-green-600/50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          <Play size={12} />
                          {loadingId === ch.id + ":activate" ? "..." : "Reativar"}
                        </button>
                      )}
                      <button
                        onClick={() => startConnect(ch.id)}
                        disabled={connectingId === ch.id}
                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600/50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={connectingId === ch.id ? "animate-spin" : ""} />
                        Reconectar
                      </button>
                    </div>
                  )}
                </div>

                {/* Instagram */}
                <div className={`px-5 py-3 flex items-center justify-between gap-3 flex-wrap ${flowsOpen && ch.instagram ? "" : ""}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Instagram size={15} className="text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">Instagram DM</span>
                        {ch.instagram ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-400 border border-purple-800/50">
                            Conectado
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
                            Não conectado
                          </span>
                        )}
                      </div>
                      {ch.instagram?.username && (
                        <p className="text-xs text-gray-400">@{ch.instagram.username}</p>
                      )}
                    </div>
                  </div>

                  {isManager && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ch.instagram ? (
                        <>
                          <button
                            onClick={() => setOpenFlowsId(flowsOpen ? null : ch.id)}
                            className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors ${
                              flowsOpen
                                ? "text-purple-300 border-purple-700 bg-purple-900/20"
                                : "text-gray-400 hover:text-white border-gray-700 hover:border-gray-500"
                            }`}
                          >
                            Condições
                            {flowsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                          <button
                            onClick={() => handleDisconnectInstagram(ch.id)}
                            disabled={disconnectingIg === ch.id}
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-800/50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                          >
                            <Link2Off size={12} />
                            {disconnectingIg === ch.id ? "..." : "Desconectar"}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setError(""); openInstagramOAuth(ch.id); }}
                          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 border border-purple-800/50 hover:border-purple-600/50 rounded-lg px-3 py-1.5 transition-colors"
                        >
                          <Instagram size={12} />
                          Conectar Instagram
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Painel de condições */}
                {flowsOpen && ch.instagram && (
                  <div className="border-t border-gray-800/60 bg-gray-950/30">
                    {/* Cabeçalho do painel */}
                    <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-gray-800/40">
                      <div>
                        <p className="text-sm font-semibold">Condições de comentário → DM</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Quando alguém comentar num post, a primeira condição que bater envia o DM configurado
                        </p>
                      </div>
                      {/* Master toggle */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">Auto-DM</span>
                        <button
                          onClick={() => updateFlowsState(ch.id, { igCommentAutoDm: !fs.igCommentAutoDm })}
                          className={`relative w-9 h-5 rounded-full transition-colors ${fs.igCommentAutoDm ? "bg-purple-600" : "bg-gray-700"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${fs.igCommentAutoDm ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </div>
                    </div>

                    <div className="px-5 py-4 space-y-3">
                      {/* Lista de flows */}
                      {fs.flows.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-4">
                          Nenhuma condição configurada. Adicione abaixo ou use o fallback.
                        </p>
                      )}

                      {fs.flows.map((flow, i) => (
                        <FlowCard
                          key={flow.id}
                          flow={flow}
                          index={i}
                          total={fs.flows.length}
                          onUpdate={(patch) => updateFlow(ch.id, flow.id, patch)}
                          onDelete={() => deleteFlow(ch.id, flow.id)}
                          onMoveUp={() => moveFlow(ch.id, i, i - 1)}
                          onMoveDown={() => moveFlow(ch.id, i, i + 1)}
                        />
                      ))}

                      {/* Botão de adicionar */}
                      <button
                        onClick={() => addFlow(ch.id)}
                        className="w-full flex items-center justify-center gap-2 text-sm text-purple-400 hover:text-purple-300 border border-dashed border-purple-800/50 hover:border-purple-600/50 rounded-xl py-2.5 transition-colors"
                      >
                        <Plus size={14} />
                        Nova condição
                      </button>

                      {/* Fallback */}
                      <div className="border-t border-gray-800/40 pt-3 space-y-1.5">
                        <div>
                          <p className="text-xs font-medium text-gray-400">Mensagem de fallback</p>
                          <p className="text-xs text-gray-600">Enviada quando nenhuma condição bate. Vazio = IA responde.</p>
                        </div>
                        <textarea
                          value={fs.igCommentDmMessage}
                          onChange={(e) => updateFlowsState(ch.id, { igCommentDmMessage: e.target.value })}
                          rows={2}
                          placeholder="Deixe vazio para o agente de IA responder automaticamente..."
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
                        />
                      </div>

                      {/* Salvar */}
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => saveFlows(ch.id)}
                          disabled={savingFlows === ch.id}
                          className="text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl px-5 py-2 transition-colors"
                        >
                          {savingFlows === ch.id ? "Salvando..." : "Salvar condições"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {confirmDeleteId && (() => {
        const ch = channels.find((c) => c.id === confirmDeleteId);
        if (!ch) return null;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-red-900/50 rounded-2xl p-6 w-full max-w-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-900/30 border border-red-800/50 flex items-center justify-center">
                  <Trash2 size={17} className="text-red-400" />
                </div>
                <div>
                  <p className="font-semibold">Excluir canal</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Excluir <span className="font-medium text-gray-200">{ch.nome}</span> remove
                    definitivamente o WhatsApp, o Instagram, todas as conversas, funis e condições deste agente.
                  </p>
                  <p className="text-xs text-red-400 mt-2">Essa ação não pode ser desfeita.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  disabled={deletingId === ch.id}
                  className="text-sm text-gray-400 hover:text-gray-200 px-4 py-2 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteChannel(ch.id)}
                  disabled={deletingId === ch.id}
                  className="text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 transition-colors"
                >
                  {deletingId === ch.id ? "Excluindo..." : "Excluir definitivamente"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal QR WhatsApp */}
      {connectingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <X size={18} />
            </button>
            <div>
              <p className="font-semibold">Conectar WhatsApp</p>
              <p className="text-xs text-gray-500 mt-0.5">{connectingChannel?.nome}</p>
            </div>

            {qrStatus?.connected ? (
              <div className="text-center space-y-2 py-4">
                <CheckCircle2 size={40} className="mx-auto text-green-400" />
                <p className="font-medium text-green-300">Conectado!</p>
                <p className="text-sm text-gray-400">{qrStatus.profileName ?? "WhatsApp"} pareado com sucesso.</p>
              </div>
            ) : qrStatus?.qrcode ? (
              <div className="text-center space-y-3">
                <img
                  src={toImageSrc(qrStatus.qrcode)}
                  alt="QR code WhatsApp"
                  className="mx-auto rounded-xl w-52 h-52 bg-white p-2"
                />
                {qrStatus.paircode && (
                  <p className="text-sm text-gray-400">
                    Código: <span className="font-mono text-gray-200">{qrStatus.paircode}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  WhatsApp no celular → Dispositivos conectados → Conectar dispositivo
                </p>
                <button
                  onClick={() => startConnect(connectingId)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Gerar novo QR code
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-52 h-52 rounded-xl bg-gray-800 animate-pulse flex items-center justify-center text-sm text-gray-500">
                  Gerando QR code...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
