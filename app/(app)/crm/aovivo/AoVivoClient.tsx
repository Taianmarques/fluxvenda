"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Radio, Clock, Bot, Instagram, MessageCircle } from "lucide-react";
import { useCrmTheme } from "../CrmThemeContext";

type AoVivoTheme = "dark" | "light";

const THEMES = {
  dark: {
    root: "bg-gray-950 text-white",
    headerBorder: "border-gray-800",
    subtitle: "text-gray-500",
    statLabel: "text-gray-400",
    card: "border-gray-800 bg-gray-900",
    cardHeaderBorder: "border-gray-800",
    cardBadge: "bg-gray-800 text-gray-400",
    innerCard: "bg-gray-950 border-gray-800",
    innerCardHover: "hover:border-gray-600",
    secondary: "text-gray-500",
    muted: "text-gray-600",
    pillButton: "bg-gray-900 border border-gray-800 hover:bg-gray-800",
    destaqueCard: "border-red-800/60 bg-red-950/20",
    destaqueBorder: "border-red-900/40",
    destaqueBadge: "bg-red-900/50 text-red-300",
    destaqueIcon: "bg-red-900/60 text-red-300",
  },
  light: {
    root: "bg-gray-50 text-slate-900",
    headerBorder: "border-gray-200",
    subtitle: "text-gray-500",
    statLabel: "text-gray-500",
    card: "border-gray-200 bg-white",
    cardHeaderBorder: "border-gray-200",
    cardBadge: "bg-gray-200 text-gray-600",
    innerCard: "bg-gray-50 border-gray-200",
    innerCardHover: "hover:border-gray-400",
    secondary: "text-gray-500",
    muted: "text-gray-400",
    pillButton: "bg-white border border-gray-200 hover:bg-gray-100",
    destaqueCard: "border-red-300 bg-red-50",
    destaqueBorder: "border-red-200",
    destaqueBadge: "bg-red-100 text-red-600",
    destaqueIcon: "bg-red-100 text-red-600",
  },
} satisfies Record<AoVivoTheme, Record<string, string>>;

type Atendente = { id: string; name: string };

type Conversa = {
  id: string;
  contactName: string | null;
  contactNumber: string;
  status: string;
  humanTakeover: boolean;
  assignedToId: string | null;
  updatedAt: string;
  lastReadAt: string | null;
  lastMessage: string | null;
  lastMessageRole: string | null;
  lastMessageAt: string | null;
};

const CORES = ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-amber-600", "bg-pink-600", "bg-cyan-600", "bg-indigo-600", "bg-rose-600"];

function hora(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function naoLida(c: Conversa): boolean {
  if (c.lastMessageRole !== "user" || !c.lastMessageAt) return false;
  return !c.lastReadAt || c.lastMessageAt > c.lastReadAt;
}

export function AoVivoClient({ agentId, atendentes }: { agentId: string; atendentes: Atendente[] }) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);
  const fingerprintRef = useRef("");
  const { theme } = useCrmTheme();
  const t = THEMES[theme];

  async function refresh(isPoll = false) {
    if (isPoll && inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch(`/api/agentes/${agentId}/conversas`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.conversations) {
        const next: Conversa[] = data.conversations.map((c: any) => ({
          id: c.id,
          contactName: c.contactName,
          contactNumber: c.contactNumber,
          status: c.status,
          humanTakeover: c.humanTakeover,
          assignedToId: c.assignedToId,
          updatedAt: c.updatedAt,
          lastReadAt: c.lastReadAt,
          lastMessage: c.messages[0]?.content ?? null,
          lastMessageRole: c.messages[0]?.role ?? null,
          lastMessageAt: c.messages[0]?.createdAt ?? null,
        }));
        const fp = JSON.stringify(next.map(c => [c.id, c.updatedAt, c.assignedToId, c.status, c.lastMessageAt, c.lastReadAt]));
        if (fp !== fingerprintRef.current) {
          fingerprintRef.current = fp;
          setConversas(next);
        }
      }
    } catch {} finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(() => { if (!document.hidden) refresh(true); }, 5000);
    const es = new EventSource(`/api/agentes/${agentId}/events`);
    es.onmessage = () => refresh(true);
    return () => { clearInterval(interval); es.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const ativas = useMemo(
    () => conversas.filter(c => c.status !== "FINALIZADO").sort((a, b) => (b.lastMessageAt ?? b.updatedAt).localeCompare(a.lastMessageAt ?? a.updatedAt)),
    [conversas]
  );

  const pendentes = ativas.filter(c => !c.assignedToId);
  const porAtendente = atendentes.map(a => ({
    atendente: a,
    conversas: ativas.filter(c => c.assignedToId === a.id),
  }));

  const totalNaoLidas = ativas.filter(naoLida).length;

  function Card({ c }: { c: Conversa }) {
    const unread = naoLida(c);
    const isIg = c.contactNumber.startsWith("ig_");
    return (
      <Link
        href={`/crm/${agentId}?c=${c.id}`}
        className={`block border rounded-xl p-3 transition-colors ${t.innerCard} ${t.innerCardHover} ${unread ? "border-blue-700/60" : ""}`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate flex items-center gap-1.5 min-w-0">
            {isIg ? <Instagram size={11} className="text-pink-400 flex-shrink-0" /> : <MessageCircle size={11} className="text-green-400 flex-shrink-0" />}
            <span className="truncate">{c.contactName || c.contactNumber.replace("ig_", "ID ")}</span>
          </p>
          <span className={`text-[10px] flex-shrink-0 ${t.secondary}`}>{hora(c.lastMessageAt ?? c.updatedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className={`text-xs truncate ${t.secondary}`}>
            {c.lastMessageRole === "user" ? "" : c.lastMessageRole === "human" ? "Você: " : c.lastMessageRole === "assistant" ? "IA: " : ""}
            {c.lastMessage || "—"}
          </p>
          {unread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {!c.humanTakeover && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-800/50 flex items-center gap-0.5">
              <Bot size={8} /> IA
            </span>
          )}
          {c.status === "AGUARDANDO" && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border border-amber-800/50">aguardando</span>
          )}
        </div>
      </Link>
    );
  }

  function Coluna({ titulo, cor, conversas: convs, destaque }: { titulo: string; cor: string; conversas: Conversa[]; destaque?: boolean }) {
    const unreadCount = convs.filter(naoLida).length;
    return (
      <div className={`w-72 flex-shrink-0 flex flex-col rounded-2xl border max-h-full ${destaque ? t.destaqueCard : t.card}`}>
        <div className={`p-3 border-b flex items-center gap-2 flex-shrink-0 ${destaque ? t.destaqueBorder : t.cardHeaderBorder}`}>
          {destaque ? (
            <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${t.destaqueIcon}`}>
              <Clock size={13} />
            </span>
          ) : (
            <span className={`w-7 h-7 rounded-full ${cor} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
              {titulo.charAt(0).toUpperCase()}
            </span>
          )}
          <p className={`flex-1 text-sm font-semibold truncate ${destaque ? "text-red-500" : ""}`}>{titulo}</p>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${destaque ? t.destaqueBadge : t.cardBadge}`}>
            {convs.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
          {convs.length === 0 ? (
            <p className={`text-xs text-center py-6 ${t.muted}`}>Nenhum atendimento</p>
          ) : (
            convs.map(c => <Card key={c.id} c={c} />)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`crm-native-scale h-full flex flex-col ${t.root}`}>
      <div className={`px-4 md:px-6 py-4 border-b flex items-center justify-between gap-3 flex-wrap flex-shrink-0 ${t.headerBorder}`}>
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Radio size={22} className="text-red-400 animate-pulse" /> Ao vivo
          </h1>
          <p className={`text-xs mt-0.5 ${t.subtitle}`}>Todos os atendimentos em andamento, por vendedor — atualiza em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-3 text-xs ${t.statLabel}`}>
            <span>{ativas.length} conversa{ativas.length === 1 ? "" : "s"} ativa{ativas.length === 1 ? "" : "s"}</span>
            {totalNaoLidas > 0 && (
              <span className="font-bold text-blue-400">{totalNaoLidas} não lida{totalNaoLidas === 1 ? "" : "s"}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {loading ? (
          <p className={`text-sm p-4 ${t.secondary}`}>Carregando atendimentos...</p>
        ) : (
          <div className="flex gap-3 h-full">
            <Coluna titulo="Pendentes" cor="" conversas={pendentes} destaque />
            {porAtendente.map((col, i) => (
              <Coluna
                key={col.atendente.id}
                titulo={col.atendente.name}
                cor={CORES[i % CORES.length]}
                conversas={col.conversas}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
