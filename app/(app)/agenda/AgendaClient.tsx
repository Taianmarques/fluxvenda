"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AvailabilityRule = { dayOfWeek: number; start: string; end: string };
type Appointment = {
  id: string;
  contactName: string | null;
  contactNumber: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "CONFIRMADO" | "CANCELADO" | "CONCLUIDO";
  notes: string;
};

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  CONFIRMADO: { label: "Confirmado", color: "bg-green-900/40 text-green-300 border-green-800/50" },
  CANCELADO: { label: "Cancelado", color: "bg-red-900/40 text-red-300 border-red-800/50" },
  CONCLUIDO: { label: "Concluído", color: "bg-gray-800 text-gray-400 border-gray-700" },
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export function AgendaClient({
  initialSchedulingEnabled, initialSlotDurationMinutes, initialAvailability,
}: {
  initialSchedulingEnabled: boolean;
  initialSlotDurationMinutes: number;
  initialAvailability: AvailabilityRule[];
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [schedulingEnabled, setSchedulingEnabled] = useState(initialSchedulingEnabled);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(initialSlotDurationMinutes);
  const [rules, setRules] = useState<Record<number, { enabled: boolean; start: string; end: string }>>(() => {
    const base: Record<number, { enabled: boolean; start: string; end: string }> = {};
    for (let i = 0; i < 7; i++) {
      const found = initialAvailability.find(r => r.dayOfWeek === i);
      base[i] = found ? { enabled: true, start: found.start, end: found.end } : { enabled: false, start: "09:00", end: "18:00" };
    }
    return base;
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newError, setNewError] = useState("");

  async function loadAppointments() {
    setLoadingAppointments(true);
    try {
      const from = fmtDate(weekStart);
      const to = fmtDate(new Date(weekStart.getTime() + 7 * 86400000));
      const res = await fetch(`/api/ferramentas/whatsapp/agendamentos?from=${from}&to=${to}`);
      const data = await res.json();
      setAppointments(data.appointments ?? []);
    } finally {
      setLoadingAppointments(false);
    }
  }

  useEffect(() => { loadAppointments(); }, [weekStart]);

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const availability: AvailabilityRule[] = Object.entries(rules)
        .filter(([, r]) => r.enabled)
        .map(([day, r]) => ({ dayOfWeek: Number(day), start: r.start, end: r.end }));

      await fetch("/api/ferramentas/whatsapp/agenda", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedulingEnabled, slotDurationMinutes, availability }),
      });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esse agendamento?")) return;
    await fetch(`/api/ferramentas/whatsapp/agendamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELADO" }),
    });
    loadAppointments();
  }

  async function handleCreateAppointment() {
    setNewError("");
    if (!newDate || !newTime || !newContactNumber.trim()) {
      setNewError("Data, horário e número do contato são obrigatórios.");
      return;
    }
    const res = await fetch("/api/ferramentas/whatsapp/agendamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: `${newDate}T${newTime}:00`,
        contactName: newContactName || undefined,
        contactNumber: newContactNumber.trim(),
        notes: newNotes || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNewError(data.error ?? "Não foi possível criar o agendamento.");
      return;
    }
    setShowNewForm(false);
    setNewDate(""); setNewTime(""); setNewContactName(""); setNewContactNumber(""); setNewNotes("");
    loadAppointments();
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm">Atendimento</p>
            <h1 className="text-3xl font-bold mt-1">📅 Agenda</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNewForm(s => !s)} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium">
              + Novo agendamento
            </button>
            <button onClick={() => setShowSettings(s => !s)} className="bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium">
              ⚙️ Configurar disponibilidade
            </button>
          </div>
        </div>

        {showNewForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <p className="font-semibold">Novo agendamento manual</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Nome do contato" value={newContactName} onChange={e => setNewContactName(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Número (com DDD)" value={newContactNumber} onChange={e => setNewContactNumber(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            </div>
            <input placeholder="Observações (opcional)" value={newNotes} onChange={e => setNewNotes(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            {newError && <p className="text-sm text-red-400">{newError}</p>}
            <button onClick={handleCreateAppointment} className="bg-green-700 hover:bg-green-600 rounded-xl px-4 py-2 text-sm font-medium">Salvar</button>
          </div>
        )}

        {showSettings && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={schedulingEnabled} onChange={e => setSchedulingEnabled(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-medium">Ativar agendamento automático pelo agente de IA</span>
            </label>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Duração de cada atendimento (minutos)</label>
              <input
                type="number" min={5} max={480} value={slotDurationMinutes}
                onChange={e => setSlotDurationMinutes(Math.max(5, Number(e.target.value)))}
                className="w-32 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Dias e horários de disponibilidade</p>
              <div className="space-y-2">
                {DIAS.map((dia, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <label className="flex items-center gap-2 w-32 flex-shrink-0 cursor-pointer">
                      <input
                        type="checkbox" checked={rules[i].enabled}
                        onChange={e => setRules(prev => ({ ...prev, [i]: { ...prev[i], enabled: e.target.checked } }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{dia}</span>
                    </label>
                    <input
                      type="time" disabled={!rules[i].enabled} value={rules[i].start}
                      onChange={e => setRules(prev => ({ ...prev, [i]: { ...prev[i], start: e.target.value } }))}
                      className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm disabled:opacity-40"
                    />
                    <span className="text-gray-500 text-sm">até</span>
                    <input
                      type="time" disabled={!rules[i].enabled} value={rules[i].end}
                      onChange={e => setRules(prev => ({ ...prev, [i]: { ...prev[i], end: e.target.value } }))}
                      className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm disabled:opacity-40"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSaveSettings} disabled={savingSettings} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
              {savingSettings ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => setWeekStart(d => new Date(d.getTime() - 7 * 86400000))} className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800">← Semana anterior</button>
          <p className="text-sm text-gray-400">{days[0].toLocaleDateString("pt-BR")} – {days[6].toLocaleDateString("pt-BR")}</p>
          <button onClick={() => setWeekStart(d => new Date(d.getTime() + 7 * 86400000))} className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800">Próxima semana →</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {days.map((day, i) => {
            const dayStr = fmtDate(day);
            const dayAppointments = appointments.filter(a => fmtDate(new Date(a.scheduledAt)) === dayStr);
            const isToday = fmtDate(day) === fmtDate(new Date());
            return (
              <div key={i} className={`bg-gray-900 border rounded-2xl p-3 min-h-[160px] ${isToday ? "border-blue-600" : "border-gray-800"}`}>
                <p className="text-xs font-semibold text-gray-300">{DIAS_ABREV[i]}</p>
                <p className="text-xs text-gray-500 mb-2">{day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>
                {loadingAppointments ? (
                  <p className="text-xs text-gray-600">Carregando...</p>
                ) : dayAppointments.length === 0 ? (
                  <p className="text-xs text-gray-600">—</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayAppointments.map(a => {
                      const st = STATUS_LABEL[a.status];
                      return (
                        <div key={a.id} className="bg-gray-950 border border-gray-800 rounded-lg p-2">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-medium">{new Date(a.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                          </div>
                          <p className="text-xs text-gray-300 truncate mt-0.5">{a.contactName || a.contactNumber}</p>
                          {a.status === "CONFIRMADO" && (
                            <button onClick={() => handleCancel(a.id)} className="text-[10px] text-red-400 hover:text-red-300 mt-1">Cancelar</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Link href="/whatsapp" className="text-xs text-gray-500 hover:text-gray-300">← Voltar para a caixa de entrada</Link>
      </div>
    </div>
  );
}
