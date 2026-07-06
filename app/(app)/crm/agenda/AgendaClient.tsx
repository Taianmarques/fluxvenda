"use client";

import { useEffect, useState } from "react";
import { Calendar, Users, Settings, ArrowLeft, ArrowRight } from "lucide-react";

type AvailabilityRule = { dayOfWeek: number; start: string; end: string };
type Appointment = {
  id: string;
  contactName: string | null;
  contactNumber: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "CONFIRMADO" | "CANCELADO" | "CONCLUIDO";
  notes: string;
  professional?: { id: string; name: string } | null;
  service?: { id: string; name: string } | null;
};
type Professional = { id: string; name: string; phone?: string; accessToken?: string | null; availability: AvailabilityRule[]; active: boolean };
type Service = { id: string; name: string; durationMinutes: number; active: boolean };

function rulesFromAvailability(availability: AvailabilityRule[]): Record<number, { enabled: boolean; start: string; end: string }> {
  const base: Record<number, { enabled: boolean; start: string; end: string }> = {};
  for (let i = 0; i < 7; i++) {
    const found = availability.find(r => r.dayOfWeek === i);
    base[i] = found ? { enabled: true, start: found.start, end: found.end } : { enabled: false, start: "09:00", end: "18:00" };
  }
  return base;
}

function AvailabilityEditor({ rules, onChange }: { rules: Record<number, { enabled: boolean; start: string; end: string }>; onChange: (r: Record<number, { enabled: boolean; start: string; end: string }>) => void }) {
  return (
    <div className="space-y-2">
      {DIAS.map((dia, i) => (
        <div key={i} className="flex items-center gap-3">
          <label className="flex items-center gap-2 w-32 flex-shrink-0 cursor-pointer">
            <input
              type="checkbox" checked={rules[i].enabled}
              onChange={e => onChange({ ...rules, [i]: { ...rules[i], enabled: e.target.checked } })}
              className="w-4 h-4"
            />
            <span className="text-sm">{dia}</span>
          </label>
          <input
            type="time" disabled={!rules[i].enabled} value={rules[i].start}
            onChange={e => onChange({ ...rules, [i]: { ...rules[i], start: e.target.value } })}
            className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm disabled:opacity-40"
          />
          <span className="text-gray-500 text-sm">até</span>
          <input
            type="time" disabled={!rules[i].enabled} value={rules[i].end}
            onChange={e => onChange({ ...rules, [i]: { ...rules[i], end: e.target.value } })}
            className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm disabled:opacity-40"
          />
        </div>
      ))}
    </div>
  );
}

function rulesToAvailability(rules: Record<number, { enabled: boolean; start: string; end: string }>): AvailabilityRule[] {
  return Object.entries(rules).filter(([, r]) => r.enabled).map(([day, r]) => ({ dayOfWeek: Number(day), start: r.start, end: r.end }));
}

function ProfessionalRow({ professional, onUpdated, onDeleted }: { professional: Professional; onUpdated: () => void; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [rules, setRules] = useState(() => rulesFromAvailability(professional.availability));
  const [phone, setPhone] = useState(professional.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/ferramentas/whatsapp/profissionais/${professional.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: rulesToAvailability(rules), phone: phone.trim() }),
      });
      setEditing(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  function copyAgendaLink() {
    if (!professional.accessToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/agenda/${professional.accessToken}`).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {});
  }

  async function toggleActive() {
    await fetch(`/api/ferramentas/whatsapp/profissionais/${professional.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !professional.active }),
    });
    onUpdated();
  }

  async function remove() {
    if (!confirm(`Remover ${professional.name}?`)) return;
    await fetch(`/api/ferramentas/whatsapp/profissionais/${professional.id}`, { method: "DELETE" });
    onDeleted();
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className={`text-sm font-medium ${!professional.active ? "text-gray-500 line-through" : ""}`}>{professional.name}</p>
          {professional.phone && <p className="text-xs text-gray-500 font-mono">+{professional.phone}</p>}
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          {professional.accessToken && (
            <button onClick={copyAgendaLink} className="text-purple-400 hover:text-purple-300">
              {linkCopied ? "Copiado!" : "Link da agenda"}
            </button>
          )}
          <button onClick={() => setEditing(s => !s)} className="text-blue-400 hover:text-blue-300">Editar</button>
          <button onClick={toggleActive} className="text-gray-400 hover:text-white">{professional.active ? "Desativar" : "Ativar"}</button>
          <button onClick={remove} className="text-red-400 hover:text-red-300">Remover</button>
        </div>
      </div>
      {editing && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">WhatsApp do profissional (recebe aviso de cada agendamento)</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ex: 5584999990000 (vazio = não notifica)"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <AvailabilityEditor rules={rules} onChange={setRules} />
          <button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      )}
    </div>
  );
}

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
  agentId, initialSchedulingEnabled, initialSlotDurationMinutes, initialAvailability, initialAppointmentReminderHours, initialRequisitosAgendamento, initialRestricoesAgendamento, initialAtendimentoEspecialEnabled, initialAtendimentoEspecialDescricao,
  initialAskProfessionalEnabled, agendaAccessToken,
}: {
  agentId: string;
  initialSchedulingEnabled: boolean;
  initialSlotDurationMinutes: number;
  initialAvailability: AvailabilityRule[];
  initialAppointmentReminderHours: number;
  initialRequisitosAgendamento: string;
  initialRestricoesAgendamento: string;
  initialAtendimentoEspecialEnabled: boolean;
  initialAtendimentoEspecialDescricao: string;
  initialAskProfessionalEnabled?: boolean;
  agendaAccessToken?: string | null;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [schedulingEnabled, setSchedulingEnabled] = useState(initialSchedulingEnabled);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(initialSlotDurationMinutes);
  const [appointmentReminderHours, setAppointmentReminderHours] = useState(initialAppointmentReminderHours);
  const [requisitosAgendamento, setRequisitosAgendamento] = useState(initialRequisitosAgendamento);
  const [restricoesAgendamento, setRestricoesAgendamento] = useState(initialRestricoesAgendamento);
  const [atendimentoEspecialEnabled, setAtendimentoEspecialEnabled] = useState(initialAtendimentoEspecialEnabled);
  const [atendimentoEspecialDescricao, setAtendimentoEspecialDescricao] = useState(initialAtendimentoEspecialDescricao);
  const [askProfessionalEnabled, setAskProfessionalEnabled] = useState(initialAskProfessionalEnabled ?? true);
  const [rules, setRules] = useState(() => rulesFromAvailability(initialAvailability));
  const [savingSettings, setSavingSettings] = useState(false);
  const [agendaLinkCopied, setAgendaLinkCopied] = useState(false);

  function copyClinicAgendaLink() {
    if (!agendaAccessToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/agenda/${agendaAccessToken}`).then(() => {
      setAgendaLinkCopied(true);
      setTimeout(() => setAgendaLinkCopied(false), 2000);
    }).catch(() => {});
  }

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [newProfessionalName, setNewProfessionalName] = useState("");
  const [newProfessionalPhone, setNewProfessionalPhone] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState(30);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newProfessionalId, setNewProfessionalId] = useState("");
  const [newServiceId, setNewServiceId] = useState("");
  const [newError, setNewError] = useState("");

  async function loadAppointments() {
    setLoadingAppointments(true);
    try {
      const from = fmtDate(weekStart);
      const to = fmtDate(new Date(weekStart.getTime() + 7 * 86400000));
      const res = await fetch(`/api/agentes/${agentId}/agendamentos?from=${from}&to=${to}`);
      const data = await res.json();
      setAppointments(data.appointments ?? []);
    } finally {
      setLoadingAppointments(false);
    }
  }

  async function loadProfessionals() {
    const res = await fetch(`/api/agentes/${agentId}/profissionais`);
    const data = await res.json();
    setProfessionals(data.professionals ?? []);
  }

  async function loadServices() {
    const res = await fetch(`/api/agentes/${agentId}/servicos`);
    const data = await res.json();
    setServices(data.services ?? []);
  }

  useEffect(() => { loadAppointments(); }, [weekStart]);
  useEffect(() => { loadProfessionals(); loadServices(); }, []);

  async function handleAddProfessional() {
    if (!newProfessionalName.trim()) return;
    await fetch(`/api/agentes/${agentId}/profissionais`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProfessionalName.trim(), phone: newProfessionalPhone.trim() }),
    });
    setNewProfessionalName("");
    setNewProfessionalPhone("");
    loadProfessionals();
  }

  async function handleAddService() {
    if (!newServiceName.trim()) return;
    await fetch(`/api/agentes/${agentId}/servicos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newServiceName.trim(), durationMinutes: newServiceDuration }),
    });
    setNewServiceName("");
    loadServices();
  }

  async function handleToggleService(service: Service) {
    await fetch(`/api/ferramentas/whatsapp/servicos/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !service.active }),
    });
    loadServices();
  }

  async function handleDeleteService(service: Service) {
    if (!confirm(`Remover ${service.name}?`)) return;
    await fetch(`/api/ferramentas/whatsapp/servicos/${service.id}`, { method: "DELETE" });
    loadServices();
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const availability = rulesToAvailability(rules);

      await fetch(`/api/agentes/${agentId}/agenda`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedulingEnabled, slotDurationMinutes, availability, appointmentReminderHours, requisitosAgendamento, restricoesAgendamento, atendimentoEspecialEnabled, atendimentoEspecialDescricao, askProfessionalEnabled }),
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
    const res = await fetch(`/api/agentes/${agentId}/agendamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: `${newDate}T${newTime}:00`,
        contactName: newContactName || undefined,
        contactNumber: newContactNumber.trim(),
        notes: newNotes || undefined,
        professionalId: newProfessionalId || undefined,
        serviceId: newServiceId || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNewError(data.error ?? "Não foi possível criar o agendamento.");
      return;
    }
    setShowNewForm(false);
    setNewDate(""); setNewTime(""); setNewContactName(""); setNewContactNumber(""); setNewNotes(""); setNewProfessionalId(""); setNewServiceId("");
    loadAppointments();
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm">Atendimento</p>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><Calendar size={28} className="text-blue-400" /> Agenda</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNewForm(s => !s)} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium">
              + Novo agendamento
            </button>
            <button onClick={() => setShowTeam(s => !s)} className="bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5">
              <Users size={15} /> Serviços e profissionais
            </button>
            <button onClick={() => setShowSettings(s => !s)} className="bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5">
              <Settings size={15} /> Configurar disponibilidade
            </button>
            {agendaAccessToken && (
              <button
                onClick={copyClinicAgendaLink}
                className="bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium text-purple-300"
                title="Página PWA com todos os agendamentos, para acompanhar no celular"
              >
                {agendaLinkCopied ? "Copiado!" : "Link da agenda geral"}
              </button>
            )}
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
            {(professionals.length > 0 || services.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {professionals.length > 0 && (
                  <select value={newProfessionalId} onChange={e => setNewProfessionalId(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm">
                    <option value="">Sem profissional específico</option>
                    {professionals.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                {services.length > 0 && (
                  <select value={newServiceId} onChange={e => setNewServiceId(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm">
                    <option value="">Sem serviço específico</option>
                    {services.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min)</option>)}
                  </select>
                )}
              </div>
            )}
            <input placeholder="Observações (opcional)" value={newNotes} onChange={e => setNewNotes(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            {newError && <p className="text-sm text-red-400">{newError}</p>}
            <button onClick={handleCreateAppointment} className="bg-green-700 hover:bg-green-600 rounded-xl px-4 py-2 text-sm font-medium">Salvar</button>
          </div>
        )}

        {showTeam && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
              <p className="font-semibold">Profissionais</p>
              <p className="text-xs text-gray-500">Cada profissional tem sua própria agenda. Se não cadastrar nenhum, o agendamento usa a disponibilidade geral configurada acima.</p>
              <div className="space-y-2">
                {professionals.map(p => (
                  <ProfessionalRow key={p.id} professional={p} onUpdated={loadProfessionals} onDeleted={loadProfessionals} />
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <input placeholder="Nome do profissional" value={newProfessionalName} onChange={e => setNewProfessionalName(e.target.value)} className="flex-1 min-w-[140px] bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
                <input placeholder="WhatsApp (opcional)" value={newProfessionalPhone} onChange={e => setNewProfessionalPhone(e.target.value)} className="w-40 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
                <button onClick={handleAddProfessional} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 text-sm font-medium">Adicionar</button>
              </div>
              <p className="text-xs text-gray-600">Com o WhatsApp preenchido, o profissional recebe aviso de cada novo agendamento. O botão "Link da agenda" gera a página que ele pode adicionar à tela inicial do celular.</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
              <p className="font-semibold">Serviços</p>
              <p className="text-xs text-gray-500">Cada serviço tem sua própria duração. Se não cadastrar nenhum, o agendamento usa a duração padrão configurada acima.</p>
              <div className="space-y-2">
                {services.map(s => (
                  <div key={s.id} className="bg-gray-950 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${!s.active ? "text-gray-500 line-through" : ""}`}>{s.name} <span className="text-gray-500 font-normal">({s.durationMinutes}min)</span></p>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => handleToggleService(s)} className="text-gray-400 hover:text-white">{s.active ? "Desativar" : "Ativar"}</button>
                      <button onClick={() => handleDeleteService(s)} className="text-red-400 hover:text-red-300">Remover</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="Nome do serviço" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
                <input type="number" min={5} max={480} value={newServiceDuration} onChange={e => setNewServiceDuration(Math.max(5, Number(e.target.value)))} className="w-20 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
                <button onClick={handleAddService} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 text-sm font-medium">Adicionar</button>
              </div>
            </div>
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
              <label className="text-sm text-gray-400 block mb-1">Enviar lembrete de confirmação quantas horas antes do compromisso</label>
              <input
                type="number" min={1} max={168} value={appointmentReminderHours}
                onChange={e => setAppointmentReminderHours(Math.max(1, Number(e.target.value)))}
                className="w-32 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">O agente pergunta se o cliente confirma presença. Se ele disser que não pode ir, a IA cancela e já oferece reagendar.</p>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Informações necessárias para o agendamento <span className="text-gray-600">(opcional)</span>
              </label>
              <textarea
                value={requisitosAgendamento}
                onChange={e => setRequisitosAgendamento(e.target.value)}
                rows={3}
                placeholder="Ex: nome completo, convênio, tipo de consulta, nome do pet e raça..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">Depois que o cliente escolher a data e o horário, o agente envia uma mensagem pedindo essas informações — e só confirma o agendamento quando o cliente responder.</p>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">
                O que NÃO fazer no agendamento <span className="text-gray-600">(opcional)</span>
              </label>
              <textarea
                value={restricoesAgendamento}
                onChange={e => setRestricoesAgendamento(e.target.value)}
                rows={3}
                placeholder="Ex: não agendar para menores de 18 anos sem responsável, não aceitar agendamentos no mesmo dia, não remarcar mais de uma vez..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">O agente vai seguir essas restrições durante toda a conversa de agendamento.</p>
            </div>

            <div className="border border-gray-800 rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={atendimentoEspecialEnabled}
                  onChange={e => setAtendimentoEspecialEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium">Permitir atendimento especial fora do horário comercial</p>
                  <p className="text-xs text-gray-500">Quando ativo, o agente informa ao cliente que é possível verificar um horário especial fora da disponibilidade normal.</p>
                </div>
              </label>
              {atendimentoEspecialEnabled && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">
                    Condições do atendimento especial <span className="text-gray-600">(opcional)</span>
                  </label>
                  <textarea
                    value={atendimentoEspecialDescricao}
                    onChange={e => setAtendimentoEspecialDescricao(e.target.value)}
                    rows={2}
                    placeholder="Ex: somente emergências, sujeito a confirmação por telefone, taxa adicional de R$ 50..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                    maxLength={500}
                  />
                </div>
              )}
            </div>

            <div className="border border-gray-800 rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={askProfessionalEnabled}
                  onChange={e => setAskProfessionalEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium">Perguntar com qual profissional o cliente quer agendar</p>
                  <p className="text-xs text-gray-500">
                    Vale quando há mais de um profissional. Desligado: o agente oferece os horários de toda a equipe e o sistema atribui automaticamente a um profissional livre.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">
                Dias e horários de disponibilidade {professionals.length > 0 && <span className="text-xs">(usado só para quem não tem profissional atribuído)</span>}
              </p>
              <AvailabilityEditor rules={rules} onChange={setRules} />
            </div>

            <button onClick={handleSaveSettings} disabled={savingSettings} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
              {savingSettings ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => setWeekStart(d => new Date(d.getTime() - 7 * 86400000))} className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 flex items-center gap-1.5"><ArrowLeft size={14} /> Semana anterior</button>
          <p className="text-sm text-gray-400">{days[0].toLocaleDateString("pt-BR")} – {days[6].toLocaleDateString("pt-BR")}</p>
          <button onClick={() => setWeekStart(d => new Date(d.getTime() + 7 * 86400000))} className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 flex items-center gap-1.5">Próxima semana <ArrowRight size={14} /></button>
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
                          {(a.professional || a.service) && (
                            <p className="text-[10px] text-gray-500 truncate">{[a.service?.name, a.professional?.name].filter(Boolean).join(" · ")}</p>
                          )}
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
      </div>
    </div>
  );
}
