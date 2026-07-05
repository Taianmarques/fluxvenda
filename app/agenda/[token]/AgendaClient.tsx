"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Phone, RefreshCw, StickyNote, User } from "lucide-react";

export type AgendaAppointment = {
  id: string;
  scheduledAt: string; // ISO
  durationMinutes: number;
  contactName: string | null;
  contactNumber: string;
  serviceName: string | null;
  professionalName?: string | null; // preenchido só na agenda geral da empresa
  notes: string;
  status: string; // CONFIRMADO | CANCELADO
};

const TZ = "America/Sao_Paulo";

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const hoje = dayKey(new Date().toISOString());
  const amanha = dayKey(new Date(Date.now() + 86400000).toISOString());
  const key = dayKey(iso);
  const nome = date.toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "long" });
  if (key === hoje) return `Hoje — ${nome}`;
  if (key === amanha) return `Amanhã — ${nome}`;
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

export function AgendaClient({
  professionalName,
  storeName,
  appointments,
}: {
  professionalName: string;
  storeName: string;
  appointments: AgendaAppointment[];
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => { setLastUpdate(new Date()); }, [appointments]);

  // Atualiza sozinho a cada 60s — o profissional deixa a aba aberta e vê chegar
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [router]);

  function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  const confirmed = appointments.filter((a) => a.status === "CONFIRMADO");

  const groups = useMemo(() => {
    const map = new Map<string, AgendaAppointment[]>();
    for (const a of confirmed) {
      const key = dayKey(a.scheduledAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.values());
  }, [confirmed]);

  const hojeCount = confirmed.filter((a) => dayKey(a.scheduledAt) === dayKey(new Date().toISOString())).length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-10">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <CalendarDays size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight truncate">{professionalName}</p>
            <p className="text-xs text-gray-500 truncate">{storeName ? `Agenda · ${storeName}` : "Agenda"}</p>
          </div>
          <button
            onClick={refresh}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            aria-label="Atualizar"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="max-w-xl mx-auto px-4 pb-2.5 flex items-center justify-between text-xs text-gray-400">
          <span>{hojeCount} atendimento{hojeCount === 1 ? "" : "s"} hoje</span>
          {lastUpdate && (
            <span>Atualizado às {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-4 space-y-6">
        {confirmed.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <CalendarDays size={40} className="mx-auto text-gray-300" />
            <p className="text-gray-500 text-sm">Nenhum agendamento a partir de hoje.</p>
          </div>
        )}

        {groups.map((group) => (
          <section key={dayKey(group[0].scheduledAt)}>
            <h2 className="text-sm font-bold text-gray-700 mb-2">{dayLabel(group[0].scheduledAt)}</h2>
            <div className="space-y-2">
              {group.map((a) => (
                <div key={a.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-3">
                  <div className="flex-shrink-0 text-center">
                    <p className="text-lg font-bold text-blue-700 leading-tight">{timeLabel(a.scheduledAt)}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-0.5 justify-center">
                      <Clock size={10} /> {a.durationMinutes}min
                    </p>
                  </div>
                  <div className="w-px bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-semibold flex items-center gap-1.5 truncate">
                      <User size={13} className="text-gray-400 flex-shrink-0" />
                      {a.contactName || "Cliente"}
                    </p>
                    {(a.serviceName || a.professionalName) && (
                      <p className="text-xs text-gray-500">
                        {[a.serviceName, a.professionalName && `com ${a.professionalName}`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <a
                      href={`https://wa.me/${a.contactNumber.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:text-green-500 flex items-center gap-1 w-fit"
                    >
                      <Phone size={11} /> {a.contactNumber}
                    </a>
                    {a.notes && (
                      <p className="text-xs text-gray-500 flex items-start gap-1">
                        <StickyNote size={11} className="flex-shrink-0 mt-0.5 text-gray-400" />
                        {a.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
