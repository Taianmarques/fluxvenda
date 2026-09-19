"use client";

import { useState, useEffect, useRef } from "react";
import { useCrmTheme } from "../CrmThemeContext";
import {
  Wifi, Pause, Play, Plus, RefreshCw, X,
  CheckCircle2, Smartphone, Instagram, Link2Off,
  Trash2, BotOff, Bot, GraduationCap, Rocket,
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

type Channel = {
  id: string;
  nome: string;
  segmento: string;
  subsegmento: string;
  active: boolean;
  whatsappAiPaused: boolean;
  instagramAiPaused: boolean;
  learningMode: boolean;
  learningModeTestNumbers: string[];
  uazapiToken: string | null;
  whatsapp: WhatsAppStatus | null;
  instagram: InstagramStatus;
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

// ─── Main component ───────────────────────────────────────────────────────────

export function CanaisClient({
  initialChannels,
  isManager,
}: {
  initialChannels: Omit<Channel, "whatsapp">[];
  isManager: boolean;
}) {
  const { theme } = useCrmTheme();
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

  // Campo de texto pra adicionar um número de teste do modo aprendizado (keyed by channelId)
  const [testNumberInputs, setTestNumberInputs] = useState<Record<string, string>>({});
  const [testNumberError, setTestNumberError] = useState<Record<string, string>>({});

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

  // Pausa só a resposta automática da IA num canal — mensagens continuam chegando normalmente
  async function handleToggleAiPause(channelId: string, field: "whatsappAiPaused" | "instagramAiPaused", current: boolean) {
    setLoadingId(channelId + ":" + field);
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, [field]: !current } : c)));
    try {
      await fetch(`/api/agentes/${channelId}/pausar-ia`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !current }),
      });
    } finally { setLoadingId(null); }
  }

  // Sai do modo aprendizado: liga a IA nos dois canais de uma vez
  async function handleAtivarIA(channelId: string) {
    setLoadingId(channelId + ":ativarIA");
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, learningMode: false, whatsappAiPaused: false, instagramAiPaused: false } : c)));
    try {
      await fetch(`/api/agentes/${channelId}/pausar-ia`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningMode: false, whatsappAiPaused: false, instagramAiPaused: false }),
      });
    } finally { setLoadingId(null); }
  }

  // Números liberados pra testar a IA de verdade pelo WhatsApp enquanto ainda em modo
  // aprendizado (ver AgentConfig.learningModeTestNumbers / lib/whatsapp-inbound.ts) — só esses
  // números recebem resposta automática antes do gestor clicar em "Ativar IA".
  async function salvarTestNumbers(channelId: string, numbers: string[]) {
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, learningModeTestNumbers: numbers } : c)));
    await fetch(`/api/agentes/${channelId}/pausar-ia`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learningModeTestNumbers: numbers }),
    });
  }

  function handleAddTestNumber(ch: Channel) {
    const raw = (testNumberInputs[ch.id] ?? "").replace(/\D/g, "");
    setTestNumberError((prev) => ({ ...prev, [ch.id]: "" }));
    if (raw.length < 8 || raw.length > 15) {
      setTestNumberError((prev) => ({ ...prev, [ch.id]: "Número inválido — use o WhatsApp completo com DDI e DDD, só números." }));
      return;
    }
    if (ch.learningModeTestNumbers.includes(raw)) {
      setTestNumberInputs((prev) => ({ ...prev, [ch.id]: "" }));
      return;
    }
    setTestNumberInputs((prev) => ({ ...prev, [ch.id]: "" }));
    salvarTestNumbers(ch.id, [...ch.learningModeTestNumbers, raw]);
  }

  function handleRemoveTestNumber(ch: Channel, numero: string) {
    salvarTestNumbers(ch.id, ch.learningModeTestNumbers.filter((n) => n !== numero));
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
      const newChannel: Channel = { ...data.config, whatsapp: null, instagram: null };
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

                {/* Modo aprendizado: estado inicial, IA não responde em nenhum canal ainda */}
                {ch.learningMode && (
                  <div className="px-5 py-3 flex flex-col gap-3 bg-blue-950/30 border-b border-blue-900/40">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GraduationCap size={15} className="text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Modo aprendizado</p>
                          <p className="text-xs text-gray-400">
                            As conversas chegam e são salvas normalmente, mas a IA ainda não responde em nenhum canal.
                          </p>
                        </div>
                      </div>
                      {isManager && (
                        <button
                          onClick={() => handleAtivarIA(ch.id)}
                          disabled={loadingId === ch.id + ":ativarIA"}
                          className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-white border border-blue-700 hover:border-blue-500 bg-blue-900/30 hover:bg-blue-900/60 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          <Rocket size={12} />
                          {loadingId === ch.id + ":ativarIA" ? "..." : "Ativar IA"}
                        </button>
                      )}
                    </div>

                    {isManager && (
                      <div className="pl-[26px] space-y-1.5">
                        <p className="text-xs text-gray-400">
                          Números de WhatsApp liberados pra testar — só eles recebem resposta de verdade da IA antes de ativar pra todo mundo:
                        </p>
                        {ch.learningModeTestNumbers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {ch.learningModeTestNumbers.map((numero) => (
                              <span key={numero} className="flex items-center gap-1.5 text-xs font-mono bg-blue-900/30 border border-blue-800/50 text-blue-200 rounded-full pl-2.5 pr-1.5 py-1">
                                +{numero}
                                <button onClick={() => handleRemoveTestNumber(ch, numero)} title="Remover" className="text-blue-400 hover:text-white">
                                  <X size={11} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            value={testNumberInputs[ch.id] ?? ""}
                            onChange={(e) => setTestNumberInputs((prev) => ({ ...prev, [ch.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && handleAddTestNumber(ch)}
                            placeholder="Ex: 5511999999999"
                            disabled={ch.learningModeTestNumbers.length >= 5}
                            className="flex-1 min-w-0 bg-blue-950/40 border border-blue-800/50 rounded-lg px-2.5 py-1.5 text-xs font-mono placeholder:text-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                          />
                          <button
                            onClick={() => handleAddTestNumber(ch)}
                            disabled={ch.learningModeTestNumbers.length >= 5}
                            className="flex-shrink-0 text-xs text-blue-300 hover:text-white border border-blue-700 hover:border-blue-500 rounded-lg px-3 py-1.5 disabled:opacity-50"
                          >
                            Adicionar
                          </button>
                        </div>
                        {testNumberError[ch.id] && <p className="text-xs text-red-400">{testNumberError[ch.id]}</p>}
                        {ch.learningModeTestNumbers.length >= 5 && <p className="text-xs text-gray-500">Limite de 5 números.</p>}
                      </div>
                    )}
                  </div>
                )}

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
                      <button
                        onClick={() => handleToggleAiPause(ch.id, "whatsappAiPaused", ch.whatsappAiPaused)}
                        disabled={loadingId === ch.id + ":whatsappAiPaused"}
                        title="Pausa só a resposta automática da IA — mensagens continuam chegando normalmente"
                        className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 ${
                          ch.whatsappAiPaused
                            ? "text-amber-300 border-amber-700 bg-amber-900/20"
                            : "text-gray-400 hover:text-white border-gray-700 hover:border-gray-500"
                        }`}
                      >
                        {ch.whatsappAiPaused ? <BotOff size={12} /> : <Bot size={12} />}
                        {ch.whatsappAiPaused ? "IA pausada" : "Pausar IA"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Instagram */}
                <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
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
                          <a
                            href={`/crm/${ch.id}/condicoes`}
                            className="flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors text-gray-400 hover:text-white border-gray-700 hover:border-gray-500"
                          >
                            Condições
                          </a>
                          <button
                            onClick={() => handleToggleAiPause(ch.id, "instagramAiPaused", ch.instagramAiPaused)}
                            disabled={loadingId === ch.id + ":instagramAiPaused"}
                            title="Pausa só a resposta automática da IA — mensagens continuam chegando normalmente"
                            className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 ${
                              ch.instagramAiPaused
                                ? "text-amber-300 border-amber-700 bg-amber-900/20"
                                : "text-gray-400 hover:text-white border-gray-700 hover:border-gray-500"
                            }`}
                          >
                            {ch.instagramAiPaused ? <BotOff size={12} /> : <Bot size={12} />}
                            {ch.instagramAiPaused ? "IA pausada" : "Pausar IA"}
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
