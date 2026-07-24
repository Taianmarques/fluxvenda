"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageCircle, Search, X, Trophy, Lock, Unlock, Bot, User, UserPlus,
  FileText, Video, Trash2, Check, Paperclip, PenLine, Mic, Sun, Moon, Smile, Zap, StickyNote, ArrowRightLeft, HandCoins, CalendarClock, ListFilter, Instagram, ArrowLeft,
  Reply, Forward, ChevronDown, Package, ImageOff, Pin,
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
  etiquetas: { id: string; nome: string; cor: string }[];
  unreadCount: number;
  pinned: boolean;
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
  forwarded?: boolean;
  replyTo?: { id: string; content: string; role: string; mediaType?: string | null; sender?: { name: string } | null } | null;
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

// Item do catálogo pra envio manual pelo atendente — mesmo shape retornado por
// GET /api/agentes/[agentId]/produtos, sem "placa" (nunca é enviada pro cliente)
type CatalogProduct = {
  id: string; name: string; price: number; precoPromocional: number | null; active: boolean;
  imagemBase64: string | null; imagemMimeType: string | null;
  marca: string | null; modelo: string | null; anoFabricacao: number | null; anoModelo: number | null;
  km: number | null; cor: string | null; cambio: string | null; combustivel: string | null; condicaoVeiculo: string | null;
  tipoNegocio: string | null; tipoImovel: string | null; areaM2: number | null; quartos: number | null;
  banheiros: number | null; vagasGaragem: number | null; bairro: string | null; cidade: string | null;
};

const CAMBIO_LABEL: Record<string, string> = { MANUAL: "Manual", AUTOMATICO: "Automático" };
const COMBUSTIVEL_LABEL: Record<string, string> = { FLEX: "Flex", GASOLINA: "Gasolina", ETANOL: "Etanol", DIESEL: "Diesel", ELETRICO: "Elétrico", HIBRIDO: "Híbrido", GNV: "GNV" };
const CONDICAO_LABEL: Record<string, string> = { NOVO: "Novo", SEMINOVO: "Seminovo", USADO: "Usado" };
const TIPO_NEGOCIO_LABEL: Record<string, string> = { VENDA: "Venda", ALUGUEL: "Aluguel" };
const TIPO_IMOVEL_LABEL: Record<string, string> = { CASA: "Casa", APARTAMENTO: "Apartamento", COMERCIAL: "Comercial", TERRENO: "Terreno" };

// Detecta o tipo do item pelos campos preenchidos (o formulário só popula um conjunto por vez)
// e monta a linha de especificações — usada tanto na lista do seletor quanto na legenda enviada.
function productSpecsLine(p: CatalogProduct): string {
  if (p.marca || p.modelo || p.anoFabricacao || p.anoModelo || p.km != null || p.condicaoVeiculo) {
    return [
      (p.anoFabricacao || p.anoModelo) ? `${p.anoFabricacao ?? "?"}/${p.anoModelo ?? "?"}` : "",
      p.km != null ? `${p.km.toLocaleString("pt-BR")} km` : "",
      p.cor ?? "",
      p.cambio ? CAMBIO_LABEL[p.cambio] ?? p.cambio : "",
      p.combustivel ? COMBUSTIVEL_LABEL[p.combustivel] ?? p.combustivel : "",
      p.condicaoVeiculo ? CONDICAO_LABEL[p.condicaoVeiculo] ?? p.condicaoVeiculo : "",
    ].filter(Boolean).join(" · ");
  }
  if (p.tipoImovel || p.tipoNegocio || p.bairro || p.areaM2 != null) {
    return [
      p.areaM2 != null ? `${p.areaM2} m²` : "",
      p.quartos != null ? `${p.quartos} quarto(s)` : "",
      p.banheiros != null ? `${p.banheiros} banheiro(s)` : "",
      [p.bairro, p.cidade].filter(Boolean).join(", "),
    ].filter(Boolean).join(" · ");
  }
  return "";
}

function productDisplayTitle(p: CatalogProduct): string {
  if (p.marca || p.modelo) return [p.marca, p.modelo].filter(Boolean).join(" ");
  return p.name;
}

function buildProductCaption(p: CatalogProduct): string {
  const price = p.precoPromocional != null ? p.precoPromocional : p.price;
  const tipo = p.tipoImovel || p.tipoNegocio
    ? [p.tipoImovel ? TIPO_IMOVEL_LABEL[p.tipoImovel] ?? p.tipoImovel : "", p.tipoNegocio ? `para ${TIPO_NEGOCIO_LABEL[p.tipoNegocio] ?? p.tipoNegocio}` : ""].filter(Boolean).join(" ")
    : "";
  const title = p.marca || p.modelo ? productDisplayTitle(p) : `${p.name}${tipo ? ` (${tipo})` : ""}`;
  const specs = productSpecsLine(p);
  return `${title} — ${formatBRL(price)}${specs ? `\n${specs}` : ""}`;
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

// Cor consistente por contato (mesma paleta usada no Ao vivo) — hash simples do nome/número
const AVATAR_COLORS = ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-amber-600", "bg-pink-600", "bg-cyan-600", "bg-indigo-600", "bg-rose-600"];
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
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
  // Encerramento com motivo (relatório de motivos na página Vendas)
  const [showEncerrar, setShowEncerrar] = useState(false);
  const [motivoSelecionado, setMotivoSelecionado] = useState("");
  const [motivoObs, setMotivoObs] = useState("");
  const [encerrando, setEncerrando] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  // Responder/encaminhar estilo WhatsApp
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [msgMenuId, setMsgMenuId] = useState<string | null>(null);
  const [forwardTargets, setForwardTargets] = useState<string[]>([]);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwarding, setForwarding] = useState(false);
  // Enviar item do catálogo manualmente (foto + legenda) na conversa
  const [pickingProduct, setPickingProduct] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[] | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
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
  // Estabilidade do polling: evita corrida ao trocar de conversa, requisições acumuladas
  // em rede lenta e re-render quando nada mudou (fingerprint)
  const selectedIdRef = useRef<string | null>(selectedId);
  const detailInFlightRef = useRef(false);
  const listInFlightRef = useRef(false);
  const detailFingerprintRef = useRef("");
  const listFingerprintRef = useRef("");
  // Scroll estilo WhatsApp: só acompanha mensagens novas se o usuário já está no fim
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const lastScrolledConversationRef = useRef<string | null>(null);
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

  async function refreshList(isPoll = false) {
    if (isPoll && listInFlightRef.current) return; // rede lenta: não acumula requisições
    listInFlightRef.current = true;
    try {
      const res = await fetch(`/api/agentes/${agentId}/conversas`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.conversations) {
        const next = data.conversations.map((c: any) => ({
          id: c.id, contactName: c.contactName, contactNumber: c.contactNumber,
          status: c.status, humanTakeover: c.humanTakeover, leadStatusId: c.leadStatusId,
          opportunities: c.opportunities, assignedToId: c.assignedToId, updatedAt: c.updatedAt,
          lastReadAt: c.lastReadAt,
          lastMessage: c.messages[0]?.content ?? null,
          lastMessageRole: c.messages[0]?.role ?? null,
          lastMessageAt: c.messages[0]?.createdAt ?? null,
          etiquetas: c.etiquetas ?? [],
          unreadCount: c.unreadCount ?? 0,
          pinned: Boolean(c.pinned),
        }));
        // Só re-renderiza a lista se algo realmente mudou
        const fp = JSON.stringify(next.map((c: any) => [
          c.id, c.updatedAt, c.lastMessageAt, c.status, c.humanTakeover, c.leadStatusId, c.assignedToId, c.lastReadAt,
          c.unreadCount, c.pinned, c.etiquetas.map((e: any) => e.id).join(","),
        ]));
        if (fp !== listFingerprintRef.current) {
          listFingerprintRef.current = fp;
          setConversations(next);
        }
      }
    } catch {} finally {
      listInFlightRef.current = false;
    }
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

  async function handleSalvarContato() {
    if (!detail) return;
    const nome = window.prompt("Nome do contato", detail.contactName ?? "");
    if (!nome || !nome.trim()) return;
    const trimmed = nome.trim();
    setDetail(d => (d ? { ...d, contactName: trimmed } : d));
    setConversations(prev => prev.map(c => c.id === detail.id ? { ...c, contactName: trimmed } : c));
    await fetch(`/api/ferramentas/whatsapp/conversas/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactName: trimmed }),
    });
    refreshList();
  }

  async function handleLeadStatusChange(conversationId: string, leadStatusId: string | null) {
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, leadStatusId } : c));
    await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadStatusId }),
    });
  }

  async function handleTogglePin(conversationId: string, pinned: boolean, e: React.MouseEvent) {
    e.stopPropagation();
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, pinned: !pinned } : c));
    await fetch(`/api/ferramentas/whatsapp/conversas/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    refreshList();
  }

  async function refreshDetail(id: string, isPoll = false) {
    if (isPoll && detailInFlightRef.current) return; // rede lenta: não acumula requisições
    detailInFlightRef.current = true;
    try {
      const res = await fetch(`/api/ferramentas/whatsapp/conversas/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      // Guarda de corrida: o usuário pode ter trocado de conversa enquanto o fetch corria
      if (selectedIdRef.current !== id || !data.conversation) return;
      const c = data.conversation;
      // Só re-renderiza o chat se algo realmente mudou (evita jank a cada tick de 3s)
      const lastMsg = c.messages[c.messages.length - 1];
      const fp = JSON.stringify([
        c.id, c.messages.length, lastMsg?.id, c.humanTakeover, c.status,
        c.assignedToId, c.leadStatusId, c.opportunities?.length,
        c.opportunities?.map((o: any) => [o.id, o.wonAt, o.dealValue]),
      ]);
      if (fp !== detailFingerprintRef.current) {
        detailFingerprintRef.current = fp;
        setDetail(c);
      }
    } catch {} finally {
      detailInFlightRef.current = false;
    }
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
    // Polling pausa com a aba/app em segundo plano e atualiza na hora ao voltar
    const interval = setInterval(() => { if (!document.hidden) refreshList(true); }, 5000);
    const onVisible = () => {
      if (document.hidden) return;
      refreshList();
      if (selectedIdRef.current) refreshDetail(selectedIdRef.current);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tempo real (SSE): o servidor avisa na hora que chega/sai mensagem — o polling vira fallback.
  // O EventSource reconecta sozinho em queda de rede (retry embutido do protocolo).
  useEffect(() => {
    const es = new EventSource(`/api/agentes/${agentId}/events`);
    es.onmessage = (ev) => {
      try {
        const e = JSON.parse(ev.data) as { conversationId: string };
        refreshList(true);
        if (e.conversationId === selectedIdRef.current) refreshDetail(e.conversationId);
      } catch {}
    };
    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    detailFingerprintRef.current = ""; // nova conversa sempre renderiza a primeira carga
    nearBottomRef.current = true;
    setReplyingTo(null); // resposta em andamento não atravessa pra outra conversa
    setMsgMenuId(null);
    if (!selectedId) { setDetail(null); setScheduledMessages([]); return; }
    refreshDetail(selectedId);
    refreshScheduled(selectedId);
    const interval = setInterval(() => {
      if (document.hidden) return;
      refreshDetail(selectedId, true);
      refreshScheduled(selectedId);
    }, 3000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Scroll estilo WhatsApp: ao abrir a conversa vai direto pro fim; depois, só acompanha
  // mensagens novas se o usuário já estava perto do fim (não puxa quem lê o histórico)
  useEffect(() => {
    if (!detail) return;
    const isFirstRender = lastScrolledConversationRef.current !== detail.id;
    lastScrolledConversationRef.current = detail.id;
    if (isFirstRender) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      nearBottomRef.current = true;
      return;
    }
    if (nearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [detail?.id, detail?.messages.length]);

  function handleChatScroll() {
    const el = chatScrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

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

  async function openProductPicker() {
    setPickingProduct(true);
    if (catalogProducts !== null) return;
    setProductsLoading(true);
    try {
      const res = await fetch(`/api/agentes/${agentId}/produtos`);
      const data = await res.json();
      setCatalogProducts((data.products ?? []).filter((p: CatalogProduct) => p.active));
    } catch {
      setCatalogProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }

  function handlePickProduct(p: CatalogProduct) {
    setInput(buildProductCaption(p));
    setAttachment(
      p.imagemBase64
        ? { base64: p.imagemBase64, type: "image", fileName: `produto-${p.id}.jpg`, previewUrl: `data:${p.imagemMimeType ?? "image/jpeg"};base64,${p.imagemBase64}` }
        : null
    );
    setPickingProduct(false);
    setProductSearch("");
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
    const replyTo = replyingTo;
    setInput("");
    setAttachment(null);
    setReplyingTo(null);
    setSending(true);
    try {
      await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}/mensagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(content && { content }),
          ...(media && { media: { base64: media.base64, type: media.type, fileName: media.fileName } }),
          ...(replyTo && { replyToMessageId: replyTo.id }),
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

  // Nome mostrado no bloco de citação: quem escreveu a mensagem citada
  function replyAuthorLabel(m: { role: string; sender?: { name: string } | null }): string {
    if (m.role === "assistant") return agentName;
    if (m.role === "human") return m.sender?.name ?? "Atendente";
    return detail?.contactName || detail?.contactNumber || "Cliente";
  }

  function replySnippet(m: { content: string; mediaType?: string | null }): string {
    if (m.mediaType && (!m.content || m.content.startsWith("["))) return "Mídia";
    return m.content;
  }

  function scrollToMessage(messageId: string) {
    document.getElementById(`msg-${messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleForward() {
    if (!forwardingMessage || !selectedId || forwardTargets.length === 0 || forwarding) return;
    setForwarding(true);
    try {
      const res = await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}/encaminhar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: forwardingMessage.id, targetConversationIds: forwardTargets }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Não foi possível encaminhar.");
        return;
      }
      setForwardingMessage(null);
      setForwardTargets([]);
      setForwardSearch("");
      await refreshList();
    } finally {
      setForwarding(false);
    }
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

  function handleEncerrar() {
    if (!selectedId) return;
    setMotivoSelecionado("");
    setMotivoObs("");
    setShowEncerrar(true);
  }

  async function confirmarEncerramento() {
    if (!selectedId || !motivoSelecionado) return;
    setEncerrando(true);
    try {
      const motivo = motivoSelecionado === "Outro" && motivoObs.trim()
        ? `Outro: ${motivoObs.trim()}`
        : motivoObs.trim() ? `${motivoSelecionado} — ${motivoObs.trim()}` : motivoSelecionado;
      await fetch(`/api/ferramentas/whatsapp/conversas/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FINALIZADO", motivoEncerramento: motivo }),
      });
      setShowEncerrar(false);
      await refreshDetail(selectedId);
      await refreshList();
    } finally {
      setEncerrando(false);
    }
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
                filteredConversations.map(c => {
                  const seed = c.contactName || c.contactNumber;
                  const isIg = isIgContact(c.contactNumber);
                  const statusColor = leadStatuses.find(s => s.id === c.leadStatusId)?.color;
                  const unread = c.unreadCount > 0;
                  return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedId(c.id); setMobileChatOpen(true); }}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { setSelectedId(c.id); setMobileChatOpen(true); } }}
                    className={`w-full text-left px-4 py-3 border-b transition-colors cursor-pointer flex items-start gap-2.5 ${t.listItemBorder} ${selectedId === c.id ? t.listItemSelected : ""} ${statusColor ? "border-l-4" : ""}`}
                    style={statusColor ? { borderLeftColor: statusColor } : undefined}
                  >
                    <div className="relative flex-shrink-0 mt-0.5">
                      <div className={`w-9 h-9 rounded-full ${avatarColor(seed)} text-white text-xs font-bold flex items-center justify-center`}>
                        {(seed || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gray-950 flex items-center justify-center border border-gray-800">
                        {isIg ? <Instagram size={8} className="text-pink-400" /> : <WhatsAppIcon size={8} />}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{c.contactName || c.contactNumber}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {c.status === "FINALIZADO" ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700/50 text-gray-300 border border-gray-600">encerrado</span>
                          ) : c.humanTakeover ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-900/50 text-orange-300 border border-orange-700">manual</span>
                          ) : null}
                          <button
                            onClick={e => handleTogglePin(c.id, c.pinned, e)}
                            title={c.pinned ? "Desafixar conversa" : "Fixar conversa"}
                            className={c.pinned ? "text-amber-400" : "text-gray-600 hover:text-gray-400"}
                          >
                            <Pin size={12} className={c.pinned ? "fill-current" : ""} />
                          </button>
                        </div>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${t.listSecondary}`}>
                        {c.lastMessageRole === "assistant" && <span className="font-semibold">IA: </span>}
                        {c.lastMessageRole === "human" && <span className="font-semibold">Você: </span>}
                        {c.lastMessage || "—"}
                      </p>
                      {c.etiquetas.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {c.etiquetas.slice(0, 3).map(et => (
                            <span
                              key={et.id}
                              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border"
                              style={{ backgroundColor: `${et.cor}22`, color: et.cor, borderColor: `${et.cor}66` }}
                            >
                              {et.nome}
                            </span>
                          ))}
                          {c.etiquetas.length > 3 && <span className="text-[9px] text-gray-500">+{c.etiquetas.length - 3}</span>}
                        </div>
                      )}
                      {c.assignedToId && (
                        <p className={`text-[10px] mt-0.5 flex items-center gap-1 truncate ${t.listTertiary}`}>
                          <User size={9} className="flex-shrink-0" />
                          {attendants.find(a => a.id === c.assignedToId)?.name ?? "Atendente"}
                        </p>
                      )}
                      {c.opportunities.length > 0 && (
                        <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${c.opportunities.some(o => o.wonAt) ? "text-green-500" : "text-gray-400"}`}>
                          {c.opportunities.some(o => o.wonAt) && <Trophy size={11} />}
                          {formatBRL(c.opportunities.reduce((sum, o) => sum + o.dealValue, 0))}
                          {c.opportunities.length > 1 && ` (${c.opportunities.length})`}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-[10px] ${t.listTertiary}`}>{timeAgo(c.updatedAt)}</p>
                          {unread && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <LeadStatusBadge
                            agentId={agentId}
                            leadStatusId={c.leadStatusId}
                            statuses={leadStatuses}
                            onChange={id => handleLeadStatusChange(c.id, id)}
                            onStatusesChange={refreshLeadStatuses}
                            dark={theme === "dark"}
                          />
                          {unread && (
                            <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })
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
                      {!detail.contactName && (
                        <button
                          onClick={handleSalvarContato}
                          title="Salvar contato"
                          className="text-blue-500 hover:text-blue-400 flex-shrink-0"
                        >
                          <UserPlus size={15} />
                        </button>
                      )}
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
                          <div className={`absolute z-20 top-full right-0 mt-1 w-48 max-w-[calc(100vw-2rem)] rounded-xl border shadow-xl p-1.5 space-y-0.5 ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
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

                <div ref={chatScrollRef} onScroll={handleChatScroll} className={`flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-5 space-y-2 ${t.chatBg}`}>
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
                      <div key={m.id} id={`msg-${m.id}`} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                        <div className={`group relative max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          m.role === "human" ? t.bubbleHuman :
                          m.role === "assistant" ? t.bubbleAssistant :
                          t.bubbleIncoming
                        }`}>
                          {/* Menu da mensagem (responder/encaminhar) — hover no desktop, sempre sutil no mobile */}
                          <button
                            onClick={() => setMsgMenuId(msgMenuId === m.id ? null : m.id)}
                            className="absolute top-1 right-1 p-0.5 rounded opacity-40 md:opacity-0 md:group-hover:opacity-100 hover:bg-black/20 transition-opacity"
                            aria-label="Ações da mensagem"
                          >
                            <ChevronDown size={14} />
                          </button>
                          {msgMenuId === m.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMsgMenuId(null)} />
                              <div className={`absolute z-20 top-6 ${isOutgoing ? "right-1" : "left-1"} w-40 rounded-xl border shadow-xl p-1 space-y-0.5 ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
                                <button
                                  onClick={() => { setReplyingTo(m); setMsgMenuId(null); }}
                                  className={`w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg ${theme === "dark" ? "text-gray-200 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-100"}`}
                                >
                                  <Reply size={14} /> Responder
                                </button>
                                <button
                                  onClick={() => { setForwardingMessage(m); setForwardTargets([]); setForwardSearch(""); setMsgMenuId(null); }}
                                  className={`w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg ${theme === "dark" ? "text-gray-200 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-100"}`}
                                >
                                  <Forward size={14} /> Encaminhar
                                </button>
                              </div>
                            </>
                          )}

                          {m.forwarded && (
                            <p className="text-[10px] opacity-60 mb-0.5 flex items-center gap-1 italic"><Forward size={10} /> Encaminhada</p>
                          )}
                          {m.replyTo && (
                            <button
                              onClick={() => scrollToMessage(m.replyTo!.id)}
                              className="w-full text-left mb-1 rounded border-l-2 border-green-400 bg-black/20 px-2 py-1"
                            >
                              <p className="text-[10px] font-semibold opacity-80">{replyAuthorLabel(m.replyTo)}</p>
                              <p className="text-xs opacity-70 line-clamp-2">
                                {replySnippet(m.replyTo) === "Mídia" ? <span className="italic">Mídia</span> : replySnippet(m.replyTo)}
                              </p>
                            </button>
                          )}
                          {m.role === "human" && <p className="text-[10px] opacity-70 mb-0.5 flex items-center gap-1 pr-5"><User size={10} /> {m.sender?.name ?? "Atendente"}</p>}
                          {m.role === "assistant" && <p className="text-[10px] opacity-70 mb-0.5 flex items-center gap-1 pr-5"><Bot size={10} /> {agentName}</p>}
                          {m.mediaUrl && m.mediaType ? (
                            <MediaContent mediaUrl={m.mediaUrl} mediaType={m.mediaType} content={m.content} />
                          ) : (
                            <p className="whitespace-pre-wrap pr-4">{m.content}</p>
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
                  {replyingTo && (
                    <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg border border-l-2 border-l-green-500 ${t.inputField}`}>
                      <Reply size={14} className="opacity-60 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold opacity-70">Respondendo a {replyAuthorLabel(replyingTo)}</p>
                        <p className="text-xs truncate opacity-70">
                          {replySnippet(replyingTo) === "Mídia" ? <span className="italic">Mídia</span> : replySnippet(replyingTo)}
                        </p>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-red-400 px-1 flex-shrink-0"><X size={14} /></button>
                    </div>
                  )}
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
                          {!isIgContact(detail.contactNumber) && (
                          <button
                            onClick={openProductPicker}
                            title="Enviar item do catálogo"
                            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10"
                          >
                            <Package size={18} />
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

      {/* Modal de encerramento com motivo */}
      {showEncerrar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">Encerrar atendimento</p>
              <button onClick={() => setShowEncerrar(false)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
            </div>
            <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              Qual o motivo do encerramento? Isso alimenta o relatório em Vendas.
            </p>
            <div className="space-y-1.5">
              {["Venda concluída", "Dúvida resolvida", "Sem interesse", "Sem resposta", "Preço", "Comprou de concorrente", "Spam / engano", "Outro"].map(m => (
                <label
                  key={m}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer text-sm transition-colors ${
                    motivoSelecionado === m
                      ? "border-blue-500 bg-blue-500/10"
                      : theme === "dark" ? "border-gray-800 hover:border-gray-600" : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo-encerramento"
                    checked={motivoSelecionado === m}
                    onChange={() => setMotivoSelecionado(m)}
                    className="w-3.5 h-3.5"
                  />
                  {m}
                </label>
              ))}
            </div>
            <textarea
              value={motivoObs}
              onChange={e => setMotivoObs(e.target.value)}
              rows={2}
              maxLength={150}
              placeholder={motivoSelecionado === "Outro" ? "Descreva o motivo..." : "Observação (opcional)"}
              className={`w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none ${theme === "dark" ? "bg-gray-950 border-gray-800" : "bg-gray-50 border-gray-200"}`}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEncerrar(false)} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2">Cancelar</button>
              <button
                onClick={confirmarEncerramento}
                disabled={!motivoSelecionado || (motivoSelecionado === "Outro" && !motivoObs.trim()) || encerrando}
                className="text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl px-4 py-2"
              >
                {encerrando ? "Encerrando..." : "Encerrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de encaminhar mensagem */}
      {forwardingMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-5 space-y-3 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
            <div className="flex items-center justify-between">
              <p className="font-semibold flex items-center gap-2"><Forward size={16} /> Encaminhar mensagem</p>
              <button onClick={() => setForwardingMessage(null)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
            </div>
            <p className={`text-xs truncate rounded-lg border-l-2 border-green-500 px-2 py-1 ${theme === "dark" ? "bg-gray-950 text-gray-400" : "bg-gray-50 text-gray-500"}`}>
              {replySnippet(forwardingMessage) === "Mídia" ? <span className="italic">Mídia</span> : replySnippet(forwardingMessage)}
            </p>
            <input
              value={forwardSearch}
              onChange={e => setForwardSearch(e.target.value)}
              placeholder="Buscar contato..."
              className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none ${theme === "dark" ? "bg-gray-950 border-gray-800" : "bg-gray-50 border-gray-200"}`}
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {conversations
                .filter(c => c.id !== selectedId && !c.contactNumber.startsWith("ig_"))
                .filter(c => {
                  const q = forwardSearch.trim().toLowerCase();
                  return !q || (c.contactName ?? "").toLowerCase().includes(q) || c.contactNumber.includes(q);
                })
                .slice(0, 50)
                .map(c => {
                  const checked = forwardTargets.includes(c.id);
                  const disabled = !checked && forwardTargets.length >= 10;
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${disabled ? "opacity-40" : "cursor-pointer"} ${
                        checked
                          ? "border-green-500 bg-green-500/10"
                          : theme === "dark" ? "border-gray-800 hover:border-gray-600" : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => setForwardTargets(prev => checked ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                        className="w-3.5 h-3.5"
                      />
                      <span className="truncate">{c.contactName || c.contactNumber}</span>
                    </label>
                  );
                })}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setForwardingMessage(null)} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2">Cancelar</button>
              <button
                onClick={handleForward}
                disabled={forwardTargets.length === 0 || forwarding}
                className="text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl px-4 py-2"
              >
                {forwarding ? "Encaminhando..." : `Encaminhar (${forwardTargets.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de enviar item do catálogo */}
      {pickingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-5 space-y-3 ${theme === "dark" ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
            <div className="flex items-center justify-between">
              <p className="font-semibold flex items-center gap-2"><Package size={16} /> Enviar item do catálogo</p>
              <button onClick={() => setPickingProduct(false)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
            </div>
            <input
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Buscar produto..."
              className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none ${theme === "dark" ? "bg-gray-950 border-gray-800" : "bg-gray-50 border-gray-200"}`}
            />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {productsLoading ? (
                <p className="text-sm text-gray-500 text-center py-6">Carregando...</p>
              ) : (catalogProducts ?? []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Nenhum produto ativo no catálogo.</p>
              ) : (catalogProducts ?? [])
                .filter(p => {
                  const q = productSearch.trim().toLowerCase();
                  if (!q) return true;
                  return [p.name, p.marca, p.modelo, p.bairro, p.cidade].some(v => v?.toLowerCase().includes(q));
                })
                .slice(0, 50)
                .map(p => {
                  const price = p.precoPromocional != null ? p.precoPromocional : p.price;
                  const specs = productSpecsLine(p);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePickProduct(p)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                        theme === "dark" ? "border-gray-800 hover:border-gray-600" : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {p.imagemBase64 ? (
                        <img src={`data:${p.imagemMimeType ?? "image/jpeg"};base64,${p.imagemBase64}`} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <span className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 flex-shrink-0"><ImageOff size={16} /></span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{productDisplayTitle(p)}</p>
                        <p className="text-xs text-gray-500 truncate">{formatBRL(price)}{specs ? ` · ${specs}` : ""}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

