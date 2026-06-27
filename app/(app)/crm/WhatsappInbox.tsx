"use client";

import { useEffect, useRef, useState } from "react";
import { WhatsappPipeline, type Stage } from "./WhatsappPipeline";
import { LeadStatusBadge, type LeadStatus } from "./LeadStatusBadge";

type ConversationSummary = {
  id: string;
  contactName: string | null;
  contactNumber: string;
  status: string;
  humanTakeover: boolean;
  stageId: string | null;
  leadStatusId: string | null;
  dealValue: number | null;
  updatedAt: string;
  lastMessage: string | null;
};

type Message = {
  id: string;
  role: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt: string;
};

type MediaKind = "image" | "video" | "audio" | "document";

type Attachment = {
  base64: string;
  type: MediaKind;
  fileName: string;
  previewUrl: string;
};

const MAX_ATTACHMENT_MB = 15;

function detectMediaKind(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

type ConversationDetail = {
  id: string;
  contactName: string | null;
  contactNumber: string;
  humanTakeover: boolean;
  messages: Message[];
};

type ChatTheme = "dark" | "light";

const THEME_STORAGE_KEY = "whatsapp-chat-theme";

const THEMES = {
  dark: {
    root: "bg-gray-950 text-white",
    header: "border-gray-800",
    subtitle: "text-gray-500",
    toggleBar: "bg-gray-900",
    toggleActive: "bg-gray-700 text-white",
    toggleInactive: "text-gray-400 hover:text-gray-200",
    sidebar: "border-gray-800",
    listItemBorder: "border-gray-900 hover:bg-gray-900",
    listItemSelected: "bg-gray-900",
    listSecondary: "text-gray-500",
    listTertiary: "text-gray-600",
    chatHeaderBorder: "border-gray-800",
    chatBg: "bg-[#0b141a]",
    bubbleIncoming: "bg-[#202c33] text-gray-100",
    bubbleAssistant: "bg-[#005c4b] text-white",
    bubbleHuman: "bg-green-700 text-white",
    inputBar: "border-gray-800",
    inputField: "bg-gray-900 border-gray-800 text-white placeholder:text-gray-500",
  },
  light: {
    root: "bg-gray-50 text-gray-900",
    header: "border-gray-200",
    subtitle: "text-gray-500",
    toggleBar: "bg-gray-200",
    toggleActive: "bg-white text-gray-900 shadow-sm",
    toggleInactive: "text-gray-600 hover:text-gray-900",
    sidebar: "border-gray-200 bg-white",
    listItemBorder: "border-gray-100 hover:bg-gray-100",
    listItemSelected: "bg-gray-100",
    listSecondary: "text-gray-500",
    listTertiary: "text-gray-400",
    chatHeaderBorder: "border-gray-200",
    chatBg: "bg-[#e9edef]",
    bubbleIncoming: "bg-white text-gray-900",
    bubbleAssistant: "bg-[#d9fdd3] text-gray-900",
    bubbleHuman: "bg-[#cfe9ff] text-gray-900",
    inputBar: "border-gray-200",
    inputField: "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400",
  },
} satisfies Record<ChatTheme, Record<string, string>>;

function timeAgo(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function MediaContent({ mediaUrl, mediaType, content }: { mediaUrl: string; mediaType: string; content: string }) {
  const isPlaceholder = !content || content.startsWith("[");
  return (
    <div>
      {mediaType === "image" && <img src={mediaUrl} alt="" className="rounded-lg max-w-[240px] max-h-[240px] object-cover mb-1" />}
      {mediaType === "video" && <video controls src={mediaUrl} className="rounded-lg max-w-[240px] mb-1" />}
      {mediaType === "audio" && <audio controls src={mediaUrl} className="mb-1" />}
      {mediaType === "document" && (
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline mb-1">
          📄 {isPlaceholder ? "Documento" : content}
        </a>
      )}
      {!isPlaceholder && mediaType !== "document" && <p className="whitespace-pre-wrap">{content}</p>}
    </div>
  );
}

export function WhatsappInbox({
  agentName, initialConversations, initialStages, initialLeadStatuses,
}: {
  agentName: string;
  initialConversations: ConversationSummary[];
  initialStages: Stage[];
  initialLeadStatuses: LeadStatus[];
}) {
  const [view, setView] = useState<"lista" | "pipeline">("lista");
  const [theme, setTheme] = useState<ChatTheme>("dark");
  const [conversations, setConversations] = useState(initialConversations);
  const [stages, setStages] = useState(initialStages);
  const [leadStatuses, setLeadStatuses] = useState(initialLeadStatuses);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachError, setAttachError] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = THEMES[theme];

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  function toggleTheme() {
    const next: ChatTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  async function refreshList() {
    try {
      const res = await fetch("/api/ferramentas/whatsapp/conversas");
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations.map((c: any) => ({
          id: c.id, contactName: c.contactName, contactNumber: c.contactNumber,
          status: c.status, humanTakeover: c.humanTakeover, stageId: c.stageId, leadStatusId: c.leadStatusId, dealValue: c.dealValue, updatedAt: c.updatedAt,
          lastMessage: c.messages[0]?.content ?? null,
        })));
      }
    } catch {}
  }

  async function refreshStages() {
    try {
      const res = await fetch("/api/ferramentas/whatsapp/etapas");
      const data = await res.json();
      if (data.stages) setStages(data.stages);
    } catch {}
  }

  async function refreshLeadStatuses() {
    try {
      const res = await fetch("/api/ferramentas/whatsapp/status");
      const data = await res.json();
      if (data.statuses) setLeadStatuses(data.statuses);
    } catch {}
  }

  async function handleLeadStatusChange(conversationId: string, leadStatusId: string | null) {
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, leadStatusId } : c));
    await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadStatusId }),
    });
  }

  async function refreshDetail(id: string) {
    try {
      const res = await fetch(`/api/ferramentas/whatsapp/conversas/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setDetail(data.conversation);
    } catch {}
  }

  useEffect(() => {
    const interval = setInterval(refreshList, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    refreshDetail(selectedId);
    const interval = setInterval(() => refreshDetail(selectedId), 3000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages.length]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  function formatRecordingTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAttachError("");
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      setAttachError(`Arquivo muito grande (máx. ${MAX_ATTACHMENT_MB}MB).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      setAttachment({
        base64,
        type: detectMediaKind(file.type),
        fileName: file.name,
        previewUrl: dataUrl,
      });
    };
    reader.onerror = () => setAttachError("Não foi possível ler o arquivo.");
    reader.readAsDataURL(file);
  }

  async function startRecording() {
    setAttachError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      setAttachError("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  function stopRecording(save: boolean) {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    recorder.onstop = () => {
      recorder.stream.getTracks().forEach(track => track.stop());
      setRecording(false);

      if (!save) return;

      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] ?? "";
        setAttachment({
          base64,
          type: "audio",
          fileName: `gravacao-${Date.now()}.webm`,
          previewUrl: dataUrl,
        });
      };
      reader.readAsDataURL(blob);
    };

    recorder.stop();
  }

  async function handleSend() {
    if ((!input.trim() && !attachment) || !selectedId || sending) return;
    const content = input.trim();
    const media = attachment;
    setInput("");
    setAttachment(null);
    setSending(true);
    try {
      await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}/mensagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(content && { content }),
          ...(media && { media: { base64: media.base64, type: media.type, fileName: media.fileName } }),
        }),
      });
      await refreshDetail(selectedId);
      await refreshList();
    } finally {
      setSending(false);
    }
  }

  async function handleRetomar() {
    if (!selectedId) return;
    await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}/retomar`, { method: "POST" });
    await refreshDetail(selectedId);
  }

  return (
    <div className={`h-full flex flex-col ${t.root}`}>
      <div className={`px-4 py-3 border-b ${t.header} flex items-center justify-between flex-shrink-0`}>
        <div>
          <p className="font-bold text-lg">💬 WhatsApp</p>
          <p className={`text-xs ${t.subtitle}`}>Agente: {agentName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Mudar para fundo claro" : "Mudar para fundo escuro"}
            className={`text-sm px-2.5 py-1.5 rounded-lg ${t.toggleBar} ${t.toggleInactive}`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <div className={`flex gap-1 rounded-lg p-1 ${t.toggleBar}`}>
            <button
              onClick={() => setView("lista")}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${view === "lista" ? t.toggleActive : t.toggleInactive}`}
            >
              💬 Lista
            </button>
            <button
              onClick={() => setView("pipeline")}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${view === "pipeline" ? t.toggleActive : t.toggleInactive}`}
            >
              📋 Pipeline
            </button>
          </div>
        </div>
      </div>

      {view === "pipeline" ? (
        <WhatsappPipeline
          stages={stages}
          leadStatuses={leadStatuses}
          conversations={conversations}
          theme={theme}
          onSelectConversation={id => { setSelectedId(id); setView("lista"); }}
          onStagesChange={refreshStages}
          onLeadStatusesChange={refreshLeadStatuses}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Lista de conversas */}
          <aside className={`w-80 flex-shrink-0 border-r ${t.sidebar} flex flex-col`}>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className={`text-sm p-4 ${t.listSecondary}`}>Nenhuma conversa ainda.</p>
              ) : (
                conversations.map(c => (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(c.id)}
                    onKeyDown={e => (e.key === "Enter" || e.key === " ") && setSelectedId(c.id)}
                    className={`w-full text-left px-4 py-3 border-b transition-colors cursor-pointer ${t.listItemBorder} ${selectedId === c.id ? t.listItemSelected : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{c.contactName || c.contactNumber}</p>
                      {c.humanTakeover && <span className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded-full bg-orange-900/50 text-orange-300 border border-orange-700">manual</span>}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${t.listSecondary}`}>{c.lastMessage || "—"}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className={`text-[10px] ${t.listTertiary}`}>{timeAgo(c.updatedAt)}</p>
                      <LeadStatusBadge
                        leadStatusId={c.leadStatusId}
                        statuses={leadStatuses}
                        onChange={id => handleLeadStatusChange(c.id, id)}
                        onStatusesChange={refreshLeadStatuses}
                        dark={theme === "dark"}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Conversa selecionada */}
          <main className="flex-1 flex flex-col">
            {!detail ? (
              <div className={`flex-1 flex items-center justify-center ${t.listSecondary}`}>
                Selecione uma conversa
              </div>
            ) : (
              <>
                <div className={`px-5 py-4 border-b ${t.chatHeaderBorder} flex items-center justify-between flex-wrap gap-2`}>
                  <div>
                    <p className="font-semibold">{detail.contactName || detail.contactNumber}</p>
                    <p className={`text-xs ${t.subtitle}`}>{detail.contactNumber}</p>
                  </div>
                  {detail.humanTakeover ? (
                    <button onClick={handleRetomar} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200">
                      ↩ Devolver para o agente
                    </button>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-900/40 text-green-300 border border-green-800/50">🤖 Agente respondendo</span>
                  )}
                </div>

                <div className={`flex-1 overflow-y-auto p-5 space-y-2 ${t.chatBg}`}>
                  {detail.messages.map(m => {
                    const isOutgoing = m.role === "assistant" || m.role === "human";
                    return (
                      <div key={m.id} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          m.role === "human" ? t.bubbleHuman :
                          m.role === "assistant" ? t.bubbleAssistant :
                          t.bubbleIncoming
                        }`}>
                          {m.role === "human" && <p className="text-[10px] opacity-70 mb-0.5">Você (atendente)</p>}
                          {m.role === "assistant" && <p className="text-[10px] opacity-70 mb-0.5">🤖 {agentName}</p>}
                          {m.mediaUrl && m.mediaType ? (
                            <MediaContent mediaUrl={m.mediaUrl} mediaType={m.mediaType} content={m.content} />
                          ) : (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          )}
                          <p className="text-[10px] opacity-60 mt-1 text-right">{new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className={`p-4 border-t ${t.inputBar}`}>
                  {attachError && <p className="text-xs text-red-400 mb-2">{attachError}</p>}
                  {attachment && (
                    <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg border ${t.inputField}`}>
                      {attachment.type === "image" ? (
                        <img src={attachment.previewUrl} alt="" className="w-10 h-10 object-cover rounded" />
                      ) : attachment.type === "audio" ? (
                        <audio controls src={attachment.previewUrl} className="h-8 flex-1" />
                      ) : (
                        <span className="text-lg">{attachment.type === "video" ? "🎬" : "📄"}</span>
                      )}
                      {attachment.type !== "audio" && <span className="text-xs truncate flex-1">{attachment.fileName}</span>}
                      <button onClick={() => setAttachment(null)} className="text-gray-500 hover:text-red-400 text-xs px-1 flex-shrink-0">✕</button>
                    </div>
                  )}

                  {recording ? (
                    <div className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${t.inputField}`}>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                      </span>
                      <span className="text-sm flex-1">Gravando... {formatRecordingTime(recordingSeconds)}</span>
                      <button onClick={() => stopRecording(false)} title="Cancelar" className="text-gray-500 hover:text-red-400 text-lg">🗑️</button>
                      <button onClick={() => stopRecording(true)} title="Usar áudio" className="bg-green-700 hover:bg-green-600 text-white rounded-lg px-3 py-1 text-sm font-medium">
                        ✓ Usar
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        title="Anexar foto, vídeo, áudio ou documento"
                        className={`px-3 rounded-xl border text-lg ${t.inputField}`}
                      >
                        📎
                      </button>
                      <button
                        onClick={startRecording}
                        title="Gravar áudio"
                        className={`px-3 rounded-xl border text-lg ${t.inputField}`}
                      >
                        🎤
                      </button>
                      <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSend()}
                        placeholder={attachment ? "Adicionar legenda (opcional)..." : "Digite uma mensagem para assumir a conversa..."}
                        className={`flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-600 ${t.inputField}`}
                      />
                      <button onClick={handleSend} disabled={sending} className="bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-xl px-5 py-2.5 text-sm font-medium text-white">
                        Enviar
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
