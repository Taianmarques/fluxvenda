"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, Clock, CheckCircle2 } from "lucide-react";

type SlotDay = { date: string; weekday: string; slots: string[] };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS_SEMANA_CURTO = ["D", "S", "T", "Q", "Q", "S", "S"];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function AgendarDemoModal({ onClose }: { onClose: () => void }) {
  const [slotsByDate, setSlotsByDate] = useState<Map<string, string[]> | null>(null);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnviar, setErroEnviar] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding/demo/slots")
      .then(res => res.json())
      .then(data => {
        const map = new Map<string, string[]>();
        for (const d of (data.slots as SlotDay[]) ?? []) map.set(d.date, d.slots);
        setSlotsByDate(map);
      })
      .catch(() => setErroCarregar(true));
  }, []);

  const maxMonth = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return startOfMonth(d);
  }, []);
  const minMonth = useMemo(() => startOfMonth(new Date()), []);

  const gridDays = useMemo(() => {
    const first = viewMonth;
    const startWeekday = first.getDay();
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array(startWeekday).fill(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(first.getFullYear(), first.getMonth(), day));
    return cells;
  }, [viewMonth]);

  const horarios = selectedDate ? slotsByDate?.get(selectedDate) ?? [] : [];

  async function confirmar() {
    if (!selectedDate || !selectedTime) return;
    setEnviando(true);
    setErroEnviar(null);
    try {
      const res = await fetch("/api/onboarding/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, time: selectedTime }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErroEnviar(data.error ?? "Não foi possível agendar. Tente outro horário.");
        return;
      }
      setConfirmado(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white text-slate-900 shadow-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <p className="font-semibold">Demonstração CRM FluxVenda</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Clock size={12} /> 40 min</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {confirmado ? (
          <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
            <CheckCircle2 size={40} className="text-green-600" />
            <p className="font-semibold text-lg">Demonstração agendada!</p>
            <p className="text-sm text-gray-500">
              {selectedDate && new Date(`${selectedDate}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} às {selectedTime}
            </p>
            <button onClick={onClose} className="mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium">
              Fechar
            </button>
          </div>
        ) : erroCarregar ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">Não foi possível carregar os horários. Tente novamente mais tarde.</p>
        ) : !slotsByDate ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">Carregando horários...</p>
        ) : (
          <div className="grid sm:grid-cols-[1fr_180px]">
            <div className="p-5 border-b sm:border-b-0 sm:border-r border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm capitalize">{MESES[viewMonth.getMonth()]} {viewMonth.getFullYear()}</p>
                <div className="flex gap-1">
                  <button
                    disabled={viewMonth <= minMonth}
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                    className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={viewMonth >= maxMonth}
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                    className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DIAS_SEMANA_CURTO.map((d, i) => (
                  <span key={i} className="text-[11px] text-gray-400 font-medium py-1">{d}</span>
                ))}
                {gridDays.map((date, i) => {
                  if (!date) return <span key={i} />;
                  const key = toDateKey(date);
                  const disponivel = (slotsByDate.get(key)?.length ?? 0) > 0;
                  const selected = key === selectedDate;
                  return (
                    <button
                      key={i}
                      disabled={!disponivel}
                      onClick={() => { setSelectedDate(key); setSelectedTime(null); }}
                      className={`aspect-square rounded-lg text-xs flex items-center justify-center transition-colors ${
                        selected ? "bg-blue-600 text-white font-medium" :
                        disponivel ? "text-gray-700 hover:bg-blue-50 font-medium" :
                        "text-gray-300"
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 max-h-80 overflow-y-auto">
              {!selectedDate ? (
                <p className="text-xs text-gray-400 text-center mt-6">Escolha um dia disponível no calendário.</p>
              ) : horarios.length === 0 ? (
                <p className="text-xs text-gray-400 text-center mt-6">Sem horários nesse dia.</p>
              ) : (
                <div className="space-y-2">
                  {horarios.map(h => (
                    <button
                      key={h}
                      onClick={() => setSelectedTime(h)}
                      className={`w-full rounded-lg border py-2 text-sm font-medium transition-colors ${
                        selectedTime === h ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!confirmado && slotsByDate && (
          <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
            <p className="text-xs text-red-600">{erroEnviar}</p>
            <button
              disabled={!selectedDate || !selectedTime || enviando}
              onClick={confirmar}
              className="ml-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium flex-shrink-0"
            >
              {enviando ? "Agendando..." : "Confirmar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
