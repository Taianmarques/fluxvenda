"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Radio, Clock, Bot, Instagram, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";

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

  // Ordem de exibição das colunas dos atendentes, por preferência do gestor. Guardada no
  // navegador (não no banco) — é uma preferência pessoal de visualização, não algo que precise
  // sincronizar entre dispositivos ou gestores da mesma equipe.
  const ordemStorageKey = `aovivo-ordem-${agentId}`;
  const [ordem, setOrdem] = useState<string[]>(() => atendentes.map(a => a.id));

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ordemStorageKey);
      if (!stored) return;
      const salvos: string[] = JSON.parse(stored);
      const ids = salvos.filter(id => atendentes.some(a => a.id === id));
      for (const a of atendentes) if (!ids.includes(a.id)) ids.push(a.id);
      // localStorage só existe no navegador — não dá pra ler no useState inicial (rodaria no
      // servidor também) sem quebrar a hidratação, então o ajuste de ordem acontece aqui.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrdem(ids);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  function moverColuna(id: string, direcao: -1 | 1) {
    setOrdem(prev => {
      const idx = prev.indexOf(id);
      const novoIdx = idx + direcao;
      if (idx < 0 || novoIdx < 0 || novoIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[novoIdx]] = [next[novoIdx], next[idx]];
      try { localStorage.setItem(ordemStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

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
  const porAtendente = ordem
    .map(id => atendentes.find(a => a.id === id))
    .filter((a): a is Atendente => !!a)
    .map(a => ({
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
        className={`block bg-gray-950 border rounded-xl p-3 hover:border-gray-600 transition-colors ${unread ? "border-blue-700/60" : "border-gray-800"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate flex items-center gap-1.5 min-w-0">
            {isIg ? <Instagram size={11} className="text-pink-400 flex-shrink-0" /> : <MessageCircle size={11} className="text-green-400 flex-shrink-0" />}
            <span className="truncate">{c.contactName || c.contactNumber.replace("ig_", "ID ")}</span>
          </p>
          <span className="text-[10px] text-gray-500 flex-shrink-0">{hora(c.lastMessageAt ?? c.updatedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-xs text-gray-500 truncate">
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

  function Coluna({ titulo, cor, conversas: convs, destaque, onMoveLeft, onMoveRight }: { titulo: string; cor: string; conversas: Conversa[]; destaque?: boolean; onMoveLeft?: () => void; onMoveRight?: () => void }) {
    const unreadCount = convs.filter(naoLida).length;
    return (
      <div className={`w-72 flex-shrink-0 flex flex-col rounded-2xl border max-h-full ${destaque ? "border-red-800/60 bg-red-950/20" : "border-gray-800 bg-gray-900"}`}>
        <div className={`p-3 border-b flex items-center gap-2 flex-shrink-0 ${destaque ? "border-red-900/40" : "border-gray-800"}`}>
          {destaque ? (
            <span className="w-7 h-7 rounded-full bg-red-900/60 text-red-300 flex items-center justify-center flex-shrink-0">
              <Clock size={13} />
            </span>
          ) : (
            <span className={`w-7 h-7 rounded-full ${cor} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
              {titulo.charAt(0).toUpperCase()}
            </span>
          )}
          <p className={`flex-1 text-sm font-semibold truncate ${destaque ? "text-red-300" : ""}`}>{titulo}</p>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${destaque ? "bg-red-900/50 text-red-300" : "bg-gray-800 text-gray-400"}`}>
            {convs.length}
          </span>
          {(onMoveLeft || onMoveRight) && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={onMoveLeft}
                disabled={!onMoveLeft}
                title="Mover coluna pra esquerda"
                className="p-0.5 rounded hover:bg-gray-800 disabled:opacity-20 disabled:cursor-not-allowed text-gray-400"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={onMoveRight}
                disabled={!onMoveRight}
                title="Mover coluna pra direita"
                className="p-0.5 rounded hover:bg-gray-800 disabled:opacity-20 disabled:cursor-not-allowed text-gray-400"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
          {convs.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-6">Nenhum atendimento</p>
          ) : (
            convs.map(c => <Card key={c.id} c={c} />)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white">
      <div className="px-4 md:px-6 py-4 border-b border-gray-800 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Radio size={22} className="text-red-400 animate-pulse" /> Ao vivo
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Todos os atendimentos em andamento, por vendedor — atualiza em tempo real.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{ativas.length} conversa{ativas.length === 1 ? "" : "s"} ativa{ativas.length === 1 ? "" : "s"}</span>
          {totalNaoLidas > 0 && (
            <span className="font-bold text-blue-400">{totalNaoLidas} não lida{totalNaoLidas === 1 ? "" : "s"}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {loading ? (
          <p className="text-sm text-gray-500 p-4">Carregando atendimentos...</p>
        ) : (
          <div className="flex gap-3 h-full">
            <Coluna titulo="Pendentes" cor="" conversas={pendentes} destaque />
            {porAtendente.map((col, i) => (
              <Coluna
                key={col.atendente.id}
                titulo={col.atendente.name}
                cor={CORES[i % CORES.length]}
                conversas={col.conversas}
                onMoveLeft={i > 0 ? () => moverColuna(col.atendente.id, -1) : undefined}
                onMoveRight={i < porAtendente.length - 1 ? () => moverColuna(col.atendente.id, 1) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
