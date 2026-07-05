"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageCircle, Search, X, Trophy, Lock, Unlock, Bot, User,
  FileText, Video, Trash2, Check, Paperclip, PenLine, Mic, Sun, Moon, Smile, Zap, StickyNote, ArrowRightLeft, HandCoins, CalendarClock, ListFilter, Instagram, ArrowLeft,
} from "lucide-react";
import { LeadStatusBadge, type LeadStatus } from "./LeadStatusBadge";
import { EmojiPicker } from "./EmojiPicker";
import { QuickReplies, type QuickReply } from "./QuickReplies";
import { OpportunitiesPanel, type Opportunity } from "./OpportunitiesPanel";
import { ScheduledMessagesPanel, type ScheduledMessage } from "./ScheduledMessagesPanel";
import { ConversationFiltersPanel, EMPTY_FILTERS, hasActiveFilters, type ConversationFilters } from "./ConversationFiltersPanel";

type ConversationSummary = {
  id: string;
  contactName: string | null;
  contactNumber: string;
  status: string;
  humanTakeover: boolean;
  leadStatusId: string | null;
  opportunities: Opportunity[];
  assignedToId: string | null;
  updatedAt: string;
  lastReadAt: string | null;
  lastMessage: string | null;
  lastMessageRole: string | null;
  lastMessageAt: string | null;
};

type Attendant = { id: string; name: string; isManager: boolean };

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Message = {
  id: string;
  role: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt: string;
  sender?: { name: string } | null;
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
  status: string;
  humanTakeover: boolean;
  assignedToId: string | null;
  opportunities: Opportunity[];
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
    statusActive: "border-blue-600 bg-blue-950/40 text-blue-300",
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
    statusActive: "border-blue-500 bg-blue-50 text-blue-700",
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

function isIgContact(contactNumber: string) {
  return contactNumber.startsWith("ig_");
}

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-green-400 flex-shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

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
          <FileText size={14} /> {isPlaceholder ? "Documento" : content}
        </a>
      )}
      {!isPlaceholder && mediaType !== "document" && <p className="whitespace-pre-wrap">{content}</p>}
    </div>
  );
}

export function WhatsappInbox({
  agentId, agentName, initialConversations, initialLeadStatuses, initialSelectedId, currentUserId, isManager, initialSignatureEnabled,
}: {
  agentId: string;
  agentName: string;
  initialConversations: ConversationSummary[];
  initialLeadStatuses: LeadStatus[];
  initialSelectedId?: string | null;
  currentUserId: string;
  isManager: boolean;
  initialSignatureEnabled: boolean;
}) {
  const [theme, setTheme] = useState<ChatTheme>("dark");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ativos" | "pendentes" | "finalizados">("ativos");
  const [conversations, setConversations] = useState(initialConversations);
  const [leadStatuses, setLeadStatuses] = useState(initialLeadStatuses);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? initialConversations[0]?.id ?? null);
  // Mobile: alterna entre lista e conversa (no desktop as duas aparecem lado a lado)
  const [mobileChatOpen, setMobileChatOpen] = useState<boolean>(Boolean(initialSelectedId));

  // Sinaliza para o layout (CrmSidebar) esconder a barra de navegação mobile com o chat aberto
  useEffect(() => {
    document.documentElement.dataset.mobileChat = mobileChatOpen ? "1" : "0";
    return () => { delete document.documentElement.dataset.mobileChat; };
  }, [mobileChatOpen]);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachError, setAttachError] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [signatureEnabled, setSignatureEnabled] = useState(initialSignatureEnabled);
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  const [showOpportunities, setShowOpportunities] = useState(false);
  const [showScheduled, setShowScheduled] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ConversationFilters>(EMPTY_FILTERS);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
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

  useEffect(() => {
    fetch(`/api/agentes/${agentId}/atendentes`)
      .then(res => res.json())
      .then(data => { if (data.attendants) setAttendants(data.attendants); })
      .catch(() => {});
    refreshQuickReplies();
  }, []);

  function toggleTheme() {
    const next: ChatTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  async function refreshList() {
    try {
      const res = await fetch(`/api/agentes/${agentId}/conversas`);
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations.map((c: any) => ({
          id: c.id, contactName: c.contactName, contactNumber: c.contactNumber,
          status: c.status, humanTakeover: c.humanTakeover, leadStatusId: c.leadStatusId,
          opportunities: c.opportunities, assignedToId: c.assignedToId, updatedAt: c.updatedAt,
          lastReadAt: c.lastReadAt,
          lastMessage: c.messages[0]?.content ?? null,
          lastMessageRole: c.messages[0]?.role ?? null,
          lastMessageAt: c.messages[0]?.createdAt ?? null,
        })));
      }
    } catch {}
  }

  async function refreshLeadStatuses() {
    try {
      const res = await fetch(`/api/agentes/${agentId}/status`);
      const data = await res.json();
      if (data.statuses) setLeadStatuses(data.statuses);
    } catch {}
  }

  async function refreshQuickReplies() {
    try {
      const res = await fetch(`/api/agentes/${agentId}/respostas-rapidas`);
      const data = await res.json();
      if (data.quickReplies) setQuickReplies(data.quickReplies);
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

  async function refreshScheduled(id: string) {
    try {
      const res = await fetch(`/api/ferramentas/whatsapp/conversas/${id}/envios-agendados`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.scheduledMessages) setScheduledMessages(data.scheduledMessages);
    } catch {}
  }

  useEffect(() => {
    const interval = setInterval(refreshList, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); setScheduledMessages([]); return; }
    refreshDetail(selectedId);
    refreshScheduled(selectedId);
    const interval = setInterval(() => { refreshDetail(selectedId); refreshScheduled(selectedId); }, 3000);
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

  function handleSelectEmoji(emoji: string) {
    // Mantém aberto pra permitir escolher vários emojis em sequência, igual ao WhatsApp
    setInput(prev => prev + emoji);
  }

  function handleSelectQuickReply(content: string) {
    setInput(content);
    setShowQuickReplies(false);
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

  async function handleSendNote() {
    if (!input.trim() || !selectedId || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}/nota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      await refreshDetail(selectedId);
    } finally {
      setSending(false);
    }
  }

  function handlePrimaryAction() {
    if (noteMode) handleSendNote();
    else handleSend();
  }

  async function handleRetomar() {
    if (!selectedId) return;
    await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}/retomar`, { method: "POST" });
    await refreshDetail(selectedId);
  }

  async function handleAssign(assignedToId: string | null) {
    if (!selectedId) return;
    const res = await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    });
    if (!res.ok) { const data = await res.json().catch(() => ({})); alert(data.error ?? "Não foi possível atualizar a atribuição."); return; }
    await refreshDetail(selectedId);
    await refreshList();
  }

  async function handleAceitar() {
    if (!selectedId) return;
    const res = await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}/aceitar`, { method: "POST" });
    if (!res.ok) { const data = await res.json().catch(() => ({})); alert(data.error ?? "Não foi possível aceitar a conversa."); return; }
    await refreshDetail(selectedId);
    await refreshList();
  }

  async function handleEncerrar() {
    if (!selectedId) return;
    if (!confirm("Encerrar esse atendimento? Se o cliente mandar outra mensagem, a conversa reabre automaticamente.")) return;
    await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "FINALIZADO" }),
    });
    await refreshDetail(selectedId);
    await refreshList();
  }

  async function handleReabrir() {
    if (!selectedId) return;
    await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ATIVO" }),
    });
    await refreshDetail(selectedId);
    await refreshList();
  }

  async function handleToggleSignature() {
    if (!isManager || signatureSaving) return;
    const next = !signatureEnabled;
    setSignatureSaving(true);
    try {
      await fetch(`/api/agentes/${agentId}/assinatura`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureEnabled: next }),
      });
      setSignatureEnabled(next);
    } finally {
      setSignatureSaving(false);
    }
  }

  const statusCounts = {
    ativos: conversations.filter(c => c.humanTakeover && c.status !== "FINALIZADO").length,
    pendentes: conversations.filter(c => !c.humanTakeover && c.status !== "FINALIZADO").length,
    finalizados: conversations.filter(c => c.status === "FINALIZADO").length,
  };

  const statusFiltered = conversations.filter(c => {
    if (statusFilter === "ativos") return c.humanTakeover && c.status !== "FINALIZADO";
    if (statusFilter === "pendentes") return !c.humanTakeover && c.status !== "FINALIZADO";
    return c.status === "FINALIZADO";
  });

  const extraFiltered = statusFiltered.filter(c => {
    if (filters.attendantId === "__none__" && c.assignedToId) return false;
    if (filters.attendantId && filters.attendantId !== "__none__" && c.assignedToId !== filters.attendantId) return false;
    if (filters.leadStatusId && c.leadStatusId !== filters.leadStatusId) return false;
    if (filters.onlyOpenOpportunity && !c.opportunities.some(o => !o.wonAt)) return false;
    if (filters.onlyUnanswered && c.lastMessageRole !== "user") return false;
    if (filters.onlyUnread) {
      const lastAt = c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0;
      const readAt = c.lastReadAt ? new Date(c.lastReadAt).getTime() : 0;
      if (!(lastAt > readAt)) return false;
    }
    return true;
  });

  const filteredConversations = search.trim()
    ? extraFiltered.filter(c => {
        const q = search.trim().toLowerCase();
        return (c.contactName ?? "").toLowerCase().includes(q)
          || c.contactNumber.includes(q)
          || (c.lastMessage ?? "").toLowerCase().includes(q);
      })
    : extraFiltered;

  return (
    <div className={`h-full flex flex-col ${t.root}`}>
      <div className={`px-4 py-3 border-b ${t.header} ${mobileChatOpen ? "hidden md:flex" : "flex"} items-center justify-between flex-shrink-0`}>
        <div>
          <p className="font-bold text-lg flex items-center gap-2"><MessageCircle size={18} /> WhatsApp</p>
          <p className={`text-xs ${t.subtitle}`}>Agente: {agentName}</p>
        </div>
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Mudar para fundo claro" : "Mudar para fundo escuro"}
          className={`p-2 rounded-lg ${t.toggleBar} ${t.toggleInactive}`}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Lista de conversas — no mobile, some quando uma conversa está aberta */}
          <aside className={`${mobileChatOpen ? "hidden md:flex" : "flex"} w-full md:w-80 flex-shrink-0 md:border-r ${t.sidebar} flex-col`}>
            <div className={`px-3 py-2.5 border-b ${t.sidebar} flex-shrink-0 space-y-2`}>
              <div className="flex items-center gap-1.5">
                {([
                  ["ativos", "Ativos"],
                  ["pendentes", "Pendentes"],
                  ["finalizados", "Finalizados"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`flex-1 text-xs font-medium px-2.5 py-1.5 rounded-full border text-center transition-colors ${
                      statusFilter === key
                        ? t.statusActive
                        : `border-transparent ${t.toggleBar} ${t.toggleInactive}`
                    }`}
                  >
                    {label} <span className="opacity-70">{statusCounts[key]}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5 ${t.toggleBar}`}>
                  <Search size={14} className="opacity-60 flex-shrink-0" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar conversa..."
                    className={`flex-1 bg-transparent text-sm focus:outline-none placeholder:opacity-60`}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="opacity-60 hover:opacity-100"><X size={14} /></button>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowFilters(s => !s)}
                    title="Filtros"
                    className={`p-2 rounded-lg ${hasActiveFilters(filters) ? "bg-blue-600 text-white" : `${t.toggleBar} ${t.toggleInactive}`}`}
                  >
                    <ListFilter size={14} />
                  </button>
                  {showFilters && (
                    <ConversationFiltersPanel
                      filters={filters}
                      onChange={setFilters}
                      attendants={attendants}
                      leadStatuses={leadStatuses}
                      onClose={() => setShowFilters(false)}
                      dark={theme === "dark"}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <p className={`text-sm p-4 ${t.listSecondary}`}>{search ? "Nenhuma conversa encontrada." : "Nenhuma conversa nessa aba."}</p>
              ) : (
                filteredConversations.map(c => (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedId(c.id); setMobileChatOpen(true); }}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { setSelectedId(c.id); setMobileChatOpen(true); } }}
                    className={`w-full text-left px-4 py-3 border-b transition-colors cursor-pointer ${t.listItemBorder} ${selectedId === c.id ? t.listItemSelected : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate flex items-center gap-1.5">
                        {isIgContact(c.contactNumber)
                          ? <Instagram size={12} className="text-pink-400 flex-shrink-0" />
                          : <WhatsAppIcon size={12} />}
                        {c.contactName || c.contactNumber}
                      </p>
                      {c.status === "FINALIZADO" ? (
                        <span className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded-full bg-gray-700/50 text-gray-300 border border-gray-600">encerrado</span>
                      ) : c.humanTakeover ? (
                        <span className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded-full bg-orange-900/50 text-orange-300 border border-orange-700">manual</span>
                      ) : null}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${t.listSecondary}`}>{c.lastMessage || "—"}</p>
                    {c.opportunities.length > 0 && (
                      <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${c.opportunities.some(o => o.wonAt) ? "text-green-500" : "text-gray-400"}`}>
                        {c.opportunities.some(o => o.wonAt) && <Trophy size={11} />}
                        {formatBRL(c.opportunities.reduce((sum, o) => sum + o.dealValue, 0))}
                        {c.opportunities.length > 1 && ` (${c.opportunities.length})`}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <p className={`text-[10px] ${t.listTertiary}`}>{timeAgo(c.updatedAt)}</p>
                      <LeadStatusBadge
                        agentId={agentId}
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

          {/* Conversa selecionada — no mobile só aparece quando aberta */}
          <main className={`${mobileChatOpen ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
            {!detail ? (
              <div className={`flex-1 flex items-center justify-center ${t.listSecondary}`}>
                Selecione uma conversa
              </div>
            ) : (
              <>
                <div className={`px-2 md:px-5 py-2 md:py-4 border-b ${t.chatHeaderBorder} flex items-center justify-between gap-1.5`}>
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <button
                      onClick={() => setMobileChatOpen(false)}
                      className={`md:hidden p-1.5 rounded-lg flex-shrink-0 ${t.toggleInactive}`}
                      aria-label="Voltar para a lista"
                    >
                      <ArrowLeft size={18} />
                    </button>
                  <div className="min-w-0">
                    <p className="font-semibold flex items-center gap-1.5">
                      {isIgContact(detail.contactNumber)
                        ? <Instagram size={14} className="text-pink-400 flex-shrink-0" />
                        : <WhatsAppIcon size={14} />}
                      {detail.contactName || (isIgContact(detail.contactNumber) ? "Instagram DM" : detail.contactNumber)}
                    </p>
                    <p className={`text-xs ${t.subtitle}`}>
                      {isIgContact(detail.contactNumber) ? `ID: ${detail.contactNumber.replace("ig_", "")}` : detail.contactNumber}
                    </p>
                    {detail.opportunities.length > 0 && (
                      <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${detail.opportunities.some(o => o.wonAt) ? "text-green-500" : "text-gray-400"}`}>
                        {detail.opportunities.some(o => o.wonAt) && <Trophy size={12} />}
                        {formatBRL(detail.opportunities.reduce((sum, o) => sum + o.dealValue, 0))}
                        {detail.opportunities.length > 1 && ` (${detail.opportunities.length})`}
                      </p>
                    )}
                  </div>
                  </div>
                  <div className="flex items-center gap-0.5 md:gap-1.5 flex-nowrap flex-shrink-0">
                    <div className="relative">
                      <button
                        onClick={() => setShowOpportunities(s => !s)}
                        title="Oportunidades"
                        className={`p-2 rounded-lg ${detail.opportunities.some(o => !o.wonAt) ? "bg-green-600 text-white" : `${t.toggleInactive} hover:bg-black/10`}`}
                      >
                        <HandCoins size={16} />
                      </button>
                      {showOpportunities && (
                        <OpportunitiesPanel
                          conversationId={detail.id}
                          opportunities={detail.opportunities}
                          onChange={() => refreshDetail(detail.id)}
                          onClose={() => setShowOpportunities(false)}
                          dark={theme === "dark"}
                        />
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setShowScheduled(s => !s)}
                        title="Agendar envio"
                        className={`p-2 rounded-lg ${scheduledMessages.length > 0 ? "bg-blue-600 text-white" : `${t.toggleInactive} hover:bg-black/10`}`}
                      >
                        <CalendarClock size={16} />
                      </button>
                      {showScheduled && (
                        <ScheduledMessagesPanel
                          conversationId={detail.id}
                          scheduledMessages={scheduledMessages}
                          onChange={() => refreshScheduled(detail.id)}
                          onClose={() => setShowScheduled(false)}
                          dark={theme === "dark"}
                        />
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setShowTransferMenu(s => !s)}
                        title="Transferir conversa"
                        className={`p-2 rounded-lg ${t.toggleInactive} hover:bg-black/10`}
                      >
                        <ArrowRightLeft size={16} />
                      </button>
                      {showTransferMenu && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowTransferMenu(false)} />
                          <div className={`absolute z-20 top-full max-md:left-0 md:right-0 mt-1 w-48 max-w-[calc(100vw-2rem)] rounded-xl border shadow-xl p-1.5 space-y-0.5 ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
                            <button
                              onClick={() => { handleAssign(null); setShowTransferMenu(false); }}
                              className={`w-full text-left text-xs px-2 py-1.5 rounded-lg ${!detail.assignedToId ? "font-semibold" : ""} ${theme === "dark" ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"}`}
                            >
                              Sem atendente
                            </button>
                            {attendants.map(a => (
                              <button
                                key={a.id}
                                onClick={() => { handleAssign(a.id); setShowTransferMenu(false); }}
                                className={`w-full text-left text-xs px-2 py-1.5 rounded-lg truncate ${a.id === detail.assignedToId ? "font-semibold" : ""} ${theme === "dark" ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"}`}
                              >
                                {a.name}{a.id === currentUserId ? " (você)" : ""}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {detail.status !== "FINALIZADO" && (
                      <button
                        onClick={detail.humanTakeover ? handleRetomar : handleAceitar}
                        title={detail.humanTakeover ? "Atendimento manual — clique para devolver ao agente de IA" : "Agente de IA respondendo — clique para assumir"}
                        className={`p-2 rounded-lg ${detail.humanTakeover ? `${t.toggleInactive} hover:bg-black/10` : "bg-green-600 text-white"}`}
                      >
                        <Bot size={16} />
                      </button>
                    )}

                    <button
                      onClick={detail.status === "FINALIZADO" ? handleReabrir : handleEncerrar}
                      title={detail.status === "FINALIZADO" ? "Encerrado — clique para reabrir" : "Encerrar atendimento"}
                      className={`p-2 rounded-lg ${detail.status === "FINALIZADO" ? "bg-gray-700 text-gray-200" : `${t.toggleInactive} hover:bg-black/10`}`}
                    >
                      {detail.status === "FINALIZADO" ? <Unlock size={16} /> : <Lock size={16} />}
                    </button>
                  </div>
                </div>

                <div className={`flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-5 space-y-2 ${t.chatBg}`}>
                  {detail.messages.map(m => {
                    if (m.role === "note") {
                      return (
                        <div key={m.id} className="flex justify-center">
                          <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-amber-900/30 border border-amber-800/40 text-amber-100">
                            <p className="text-[10px] opacity-80 mb-0.5 flex items-center gap-1 text-amber-300">
                              <StickyNote size={10} /> Nota interna — {m.sender?.name ?? "Atendente"}
                            </p>
                            <p className="whitespace-pre-wrap">{m.content}</p>
                            <p className="text-[10px] opacity-60 mt-1 text-right">{new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                      );
                    }
                    const isOutgoing = m.role === "assistant" || m.role === "human";
                    return (
                      <div key={m.id} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          m.role === "human" ? t.bubbleHuman :
                          m.role === "assistant" ? t.bubbleAssistant :
                          t.bubbleIncoming
                        }`}>
                          {m.role === "human" && <p className="text-[10px] opacity-70 mb-0.5 flex items-center gap-1"><User size={10} /> {m.sender?.name ?? "Atendente"}</p>}
                          {m.role === "assistant" && <p className="text-[10px] opacity-70 mb-0.5 flex items-center gap-1"><Bot size={10} /> {agentName}</p>}
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
                        <span className="text-gray-400">{attachment.type === "video" ? <Video size={20} /> : <FileText size={20} />}</span>
                      )}
                      {attachment.type !== "audio" && <span className="text-xs truncate flex-1">{attachment.fileName}</span>}
                      <button onClick={() => setAttachment(null)} className="text-gray-500 hover:text-red-400 px-1 flex-shrink-0"><X size={14} /></button>
                    </div>
                  )}

                  {recording ? (
                    <div className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${t.inputField}`}>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                      </span>
                      <span className="text-sm flex-1">Gravando... {formatRecordingTime(recordingSeconds)}</span>
                      <button onClick={() => stopRecording(false)} title="Cancelar" className="text-gray-500 hover:text-red-400"><Trash2 size={18} /></button>
                      <button onClick={() => stopRecording(true)} title="Usar áudio" className="bg-green-700 hover:bg-green-600 text-white rounded-lg px-3 py-1 text-sm font-medium flex items-center gap-1">
                        <Check size={14} /> Usar
                      </button>
                    </div>
                  ) : (
                    <div className={`relative rounded-2xl border px-3 py-2 ${t.inputField}`}>
                      {showEmojiPicker && (
                        <EmojiPicker onSelect={handleSelectEmoji} onClose={() => setShowEmojiPicker(false)} dark={theme === "dark"} />
                      )}
                      {showQuickReplies && (
                        <QuickReplies
                          agentId={agentId}
                          quickReplies={quickReplies}
                          onSelect={handleSelectQuickReply}
                          onChange={refreshQuickReplies}
                          onClose={() => setShowQuickReplies(false)}
                          dark={theme === "dark"}
                        />
                      )}
                      <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handlePrimaryAction()}
                        placeholder={noteMode ? "Escreva uma nota interna (só a equipe vê)..." : attachment ? "Adicionar legenda (opcional)..." : "Digite uma mensagem para assumir a conversa..."}
                        className="w-full bg-transparent text-sm focus:outline-none"
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-0.5">
                          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                          <button
                            onClick={() => setShowEmojiPicker(s => !s)}
                            title="Emojis"
                            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10"
                          >
                            <Smile size={18} />
                          </button>
                          <button
                            onClick={() => setShowQuickReplies(s => !s)}
                            title="Respostas rápidas"
                            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10"
                          >
                            <Zap size={18} />
                          </button>
                          {!isIgContact(detail.contactNumber) && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            title="Anexar foto, vídeo, áudio ou documento"
                            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10"
                          >
                            <Paperclip size={18} />
                          </button>
                          )}
                          <button
                            onClick={handleToggleSignature}
                            disabled={!isManager || signatureSaving}
                            title={
                              isManager
                                ? signatureEnabled ? "Assinatura ativada — clique pra desativar" : "Assinatura desativada — clique pra ativar"
                                : signatureEnabled ? "Assinatura ativada pelo gestor" : "Assinatura desativada pelo gestor"
                            }
                            className={`p-1.5 rounded-lg hover:bg-black/10 ${signatureEnabled ? "text-blue-500" : "opacity-70 hover:opacity-100"} ${!isManager ? "cursor-default" : ""}`}
                          >
                            <PenLine size={18} />
                          </button>
                          <button
                            onClick={() => setNoteMode(s => !s)}
                            title={noteMode ? "Nota interna ativada — clique pra voltar a enviar mensagem" : "Escrever nota interna (não envia ao cliente)"}
                            className={`p-1.5 rounded-lg ${noteMode ? "bg-amber-500 text-white" : "opacity-70 hover:opacity-100 hover:bg-black/10"}`}
                          >
                            <StickyNote size={18} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isIgContact(detail.contactNumber) && (
                          <button onClick={startRecording} title="Gravar áudio" className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10">
                            <Mic size={18} />
                          </button>
                          )}
                          <button
                            onClick={handlePrimaryAction}
                            disabled={sending || (noteMode && !input.trim())}
                            className={`rounded-full px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${noteMode ? "bg-amber-600 hover:bg-amber-500" : "bg-green-700 hover:bg-green-600"}`}
                          >
                            {noteMode ? "Salvar nota" : "Enviar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
    </div>
  );
}

