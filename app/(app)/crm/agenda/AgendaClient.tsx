"use client";

import { useEffect, useState } from "react";
import { Calendar, Users, Settings, ArrowLeft, ArrowRight, X, ChevronDown } from "lucide-react";
import { useCrmTheme } from "../CrmThemeContext";
import { ICON_OPTIONS } from "@/lib/segment-icons";

type AgendaTheme = "dark" | "light";

const THEMES = {
  dark: {
    root: "bg-gray-950 text-white",
    card: "bg-gray-900 border-gray-800",
    innerCard: "bg-gray-950 border-gray-800",
    input: "bg-gray-950 border-gray-800 text-white placeholder:text-gray-500",
    border: "border-gray-800",
    subtitle: "text-gray-400",
    secondary: "text-gray-500",
    muted: "text-gray-600",
    pillButton: "bg-gray-800 hover:bg-gray-700 text-white",
    pillBg: "bg-gray-800 hover:bg-gray-700",
    navButton: "text-gray-400 hover:text-white bg-gray-900 border-gray-800",
    toggleBar: "bg-gray-900 border-gray-800",
    headerCellToday: "bg-blue-950/30",
    gridLine: "border-gray-800/60",
    hourLabel: "text-gray-500",
  },
  light: {
    root: "bg-gray-50 text-slate-900",
    card: "bg-white border-gray-200",
    innerCard: "bg-gray-50 border-gray-200",
    input: "bg-white border-gray-300 text-slate-900 placeholder:text-gray-400",
    border: "border-gray-200",
    subtitle: "text-gray-500",
    secondary: "text-gray-500",
    muted: "text-gray-400",
    pillButton: "bg-gray-200 hover:bg-gray-300 text-slate-900",
    pillBg: "bg-gray-200 hover:bg-gray-300",
    navButton: "text-gray-600 hover:text-slate-900 bg-white border-gray-200",
    toggleBar: "bg-white border-gray-200",
    headerCellToday: "bg-blue-50",
    gridLine: "border-gray-200",
    hourLabel: "text-gray-400",
  },
} satisfies Record<AgendaTheme, Record<string, string>>;

type AvailabilityRule = { dayOfWeek: number; start: string; end: string };
type Appointment = {
  id: string;
  contactName: string | null;
  contactNumber: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "CONFIRMADO" | "CANCELADO" | "CONCLUIDO" | "AGUARDANDO_PAGAMENTO";
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

function SettingsSection({ title, subtitle, open, onToggle, t, children }: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  t: typeof THEMES["dark"];
  children: React.ReactNode;
}) {
  return (
    <div className={`border rounded-xl overflow-hidden ${t.border}`}>
      <button type="button" onClick={onToggle} className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left ${t.pillBg}`}>
        <div>
          <p className="text-sm font-medium">{title}</p>
          {subtitle && <p className={`text-xs mt-0.5 ${t.secondary}`}>{subtitle}</p>}
        </div>
        <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function AvailabilityEditor({ rules, onChange, t }: {
  rules: Record<number, { enabled: boolean; start: string; end: string }>;
  onChange: (r: Record<number, { enabled: boolean; start: string; end: string }>) => void;
  t: typeof THEMES["dark"];
}) {
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
            className={`border rounded-lg px-2 py-1.5 text-sm disabled:opacity-40 ${t.input}`}
          />
          <span className={`text-sm ${t.secondary}`}>até</span>
          <input
            type="time" disabled={!rules[i].enabled} value={rules[i].end}
            onChange={e => onChange({ ...rules, [i]: { ...rules[i], end: e.target.value } })}
            className={`border rounded-lg px-2 py-1.5 text-sm disabled:opacity-40 ${t.input}`}
          />
        </div>
      ))}
    </div>
  );
}

function rulesToAvailability(rules: Record<number, { enabled: boolean; start: string; end: string }>): AvailabilityRule[] {
  return Object.entries(rules).filter(([, r]) => r.enabled).map(([day, r]) => ({ dayOfWeek: Number(day), start: r.start, end: r.end }));
}

function ProfessionalRow({ professional, onUpdated, onDeleted, t }: { professional: Professional; onUpdated: () => void; onDeleted: () => void; t: typeof THEMES["dark"] }) {
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
    <div className={`border rounded-xl p-3 ${t.innerCard}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className={`text-sm font-medium ${!professional.active ? `${t.secondary} line-through` : ""}`}>{professional.name}</p>
          {professional.phone && <p className={`text-xs font-mono ${t.secondary}`}>+{professional.phone}</p>}
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          {professional.accessToken && (
            <button onClick={copyAgendaLink} className="text-purple-400 hover:text-purple-300">
              {linkCopied ? "Copiado!" : "Link da agenda"}
            </button>
          )}
          <button onClick={() => setEditing(s => !s)} className="text-blue-400 hover:text-blue-300">Editar</button>
          <button onClick={toggleActive} className={`${t.subtitle} hover:opacity-80`}>{professional.active ? "Desativar" : "Ativar"}</button>
          <button onClick={remove} className="text-red-400 hover:text-red-300">Remover</button>
        </div>
      </div>
      {editing && (
        <div className="mt-3 space-y-3">
          <div>
            <label className={`text-xs block mb-1 ${t.subtitle}`}>WhatsApp do profissional (recebe aviso de cada agendamento)</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ex: 5584999990000 (vazio = não notifica)"
              className={`w-full border rounded-xl px-3 py-2 text-sm ${t.input}`}
            />
          </div>
          <p className={`text-xs ${t.secondary}`}>
            Deixe os horários vazios para o profissional usar o horário de funcionamento da empresa.
            Se preencher, valem só os horários que estiverem dentro do funcionamento.
          </p>
          <AvailabilityEditor rules={rules} onChange={setRules} t={t} />
          <button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium text-white">
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
  AGUARDANDO_PAGAMENTO: { label: "Aguardando pagamento", color: "bg-yellow-900/40 text-yellow-300 border-yellow-800/50" },
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

const HOUR_HEIGHT = 56; // px por hora na grade
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;

const STATUS_BLOCK: Record<string, string> = {
  CONFIRMADO: "bg-green-700/80 border-green-500 hover:bg-green-600/80",
  CANCELADO: "bg-red-900/60 border-red-700 hover:bg-red-800/60 opacity-70",
  CONCLUIDO: "bg-gray-700/70 border-gray-600 hover:bg-gray-600/70",
  AGUARDANDO_PAGAMENTO: "bg-yellow-700/70 border-yellow-500 hover:bg-yellow-600/70",
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function computeHourBounds(
  rules: Record<number, { enabled: boolean; start: string; end: string }>,
  appointments: Appointment[]
): { startHour: number; endHour: number } {
  let minMin = DEFAULT_START_HOUR * 60;
  let maxMin = DEFAULT_END_HOUR * 60;
  for (let i = 0; i < 7; i++) {
    if (rules[i]?.enabled) {
      minMin = Math.min(minMin, toMinutes(rules[i].start));
      maxMin = Math.max(maxMin, toMinutes(rules[i].end));
    }
  }
  for (const a of appointments) {
    const start = new Date(a.scheduledAt);
    const startMin = start.getHours() * 60 + start.getMinutes();
    minMin = Math.min(minMin, startMin);
    maxMin = Math.max(maxMin, startMin + a.durationMinutes);
  }
  return {
    startHour: Math.max(0, Math.floor(minMin / 60)),
    endHour: Math.min(24, Math.ceil(maxMin / 60)),
  };
}

type LaidOutAppointment = Appointment & { startMin: number; endMin: number; col: number; cols: number };

function layoutDayAppointments(appointments: Appointment[]): LaidOutAppointment[] {
  const sorted = [...appointments]
    .map(a => {
      const start = new Date(a.scheduledAt);
      const startMin = start.getHours() * 60 + start.getMinutes();
      return { ...a, startMin, endMin: startMin + a.durationMinutes, col: 0, cols: 1 };
    })
    .sort((a, b) => a.startMin - b.startMin);

  const result: LaidOutAppointment[] = [];
  let cluster: LaidOutAppointment[] = [];
  let clusterEnd = -Infinity;

  function flush() {
    if (cluster.length === 0) return;
    const colEnds: number[] = [];
    for (const ev of cluster) {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (ev.startMin >= colEnds[c]) {
          ev.col = c;
          colEnds[c] = ev.endMin;
          placed = true;
          break;
        }
      }
      if (!placed) {
        ev.col = colEnds.length;
        colEnds.push(ev.endMin);
      }
    }
    const cols = colEnds.length;
    for (const ev of cluster) {
      ev.cols = cols;
      result.push(ev);
    }
    cluster = [];
  }

  for (const ev of sorted) {
    if (cluster.length > 0 && ev.startMin >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.endMin);
  }
  flush();

  return result;
}

export function AgendaClient({
  agentId, initialSchedulingEnabled, initialSlotDurationMinutes, initialAvailability, initialAppointmentReminderHours, initialRequisitosAgendamento, initialRestricoesAgendamento, initialAtendimentoEspecialEnabled, initialAtendimentoEspecialDescricao,
  initialAskProfessionalEnabled, initialSchedulingViaLink, initialAgendarAteEncerramento, initialVagasSimultaneas,
  initialAgendamentoCobrancaEnabled, initialAgendamentoSinalValor, hasAsaasApiKey, initialBookingFormFields, agendaAccessToken, bookingSlug,
  initialAgendamentoIcone,
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
  initialSchedulingViaLink?: boolean;
  initialAgendarAteEncerramento?: boolean;
  initialVagasSimultaneas?: number;
  initialAgendamentoCobrancaEnabled?: boolean;
  initialAgendamentoSinalValor?: number;
  hasAsaasApiKey?: boolean;
  initialBookingFormFields?: { label: string; obrigatorio: boolean }[];
  agendaAccessToken?: string | null;
  bookingSlug?: string | null;
  initialAgendamentoIcone?: string | null;
}) {
  const { theme } = useCrmTheme();
  const t = THEMES[theme];

  const [showSettings, setShowSettings] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [openSettingsSections, setOpenSettingsSections] = useState<Set<string>>(new Set(["modo"]));
  function toggleSettingsSection(key: string) {
    setOpenSettingsSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  const [schedulingEnabled, setSchedulingEnabled] = useState(initialSchedulingEnabled);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(initialSlotDurationMinutes);
  const [appointmentReminderHours, setAppointmentReminderHours] = useState(initialAppointmentReminderHours);
  const [requisitosAgendamento, setRequisitosAgendamento] = useState(initialRequisitosAgendamento);
  const [restricoesAgendamento, setRestricoesAgendamento] = useState(initialRestricoesAgendamento);
  const [atendimentoEspecialEnabled, setAtendimentoEspecialEnabled] = useState(initialAtendimentoEspecialEnabled);
  const [atendimentoEspecialDescricao, setAtendimentoEspecialDescricao] = useState(initialAtendimentoEspecialDescricao);
  const [askProfessionalEnabled, setAskProfessionalEnabled] = useState(initialAskProfessionalEnabled ?? true);
  const [schedulingViaLink, setSchedulingViaLink] = useState(initialSchedulingViaLink ?? false);
  const [agendarAteEncerramento, setAgendarAteEncerramento] = useState(initialAgendarAteEncerramento ?? false);
  const [vagasSimultaneas, setVagasSimultaneas] = useState(initialVagasSimultaneas ?? 1);
  const [agendamentoCobrancaEnabled, setAgendamentoCobrancaEnabled] = useState(initialAgendamentoCobrancaEnabled ?? false);
  const [agendamentoSinalValor, setAgendamentoSinalValor] = useState(initialAgendamentoSinalValor ?? 0);
  const [bookingFormFields, setBookingFormFields] = useState<{ label: string; obrigatorio: boolean }[]>(initialBookingFormFields ?? []);
  const [agendamentoIcone, setAgendamentoIcone] = useState<string | null>(initialAgendamentoIcone ?? null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [rules, setRules] = useState(() => rulesFromAvailability(initialAvailability));
  const [savingSettings, setSavingSettings] = useState(false);
  const [agendaLinkCopied, setAgendaLinkCopied] = useState(false);
  const [bookingLinkCopied, setBookingLinkCopied] = useState(false);

  function copyClinicAgendaLink() {
    if (!agendaAccessToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/agenda/${agendaAccessToken}`).then(() => {
      setAgendaLinkCopied(true);
      setTimeout(() => setAgendaLinkCopied(false), 2000);
    }).catch(() => {});
  }

  function copyBookingLink() {
    if (!bookingSlug) return;
    navigator.clipboard.writeText(`${window.location.origin}/agendar/${bookingSlug}`).then(() => {
      setBookingLinkCopied(true);
      setTimeout(() => setBookingLinkCopied(false), 2000);
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
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

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
        body: JSON.stringify({ schedulingEnabled, slotDurationMinutes, availability, appointmentReminderHours, requisitosAgendamento, restricoesAgendamento, atendimentoEspecialEnabled, atendimentoEspecialDescricao, askProfessionalEnabled, schedulingViaLink, agendarAteEncerramento, vagasSimultaneas, agendamentoCobrancaEnabled, agendamentoSinalValor, bookingFormFields, agendamentoIcone }),
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
    <div className={`crm-native-scale h-full overflow-y-auto p-6 ${t.root}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className={`text-sm ${t.subtitle}`}>Atendimento</p>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><Calendar size={28} className="text-blue-400" /> Agenda</h1>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setShowNewForm(s => !s)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium">
              + Novo agendamento
            </button>
            <button onClick={() => setShowTeam(s => !s)} className={`rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 ${t.pillButton}`}>
              <Users size={15} /> Serviços e profissionais
            </button>
            <button onClick={() => setShowSettings(s => !s)} className={`rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 ${t.pillButton}`}>
              <Settings size={15} /> Configurações
            </button>
          </div>
        </div>

        {showNewForm && (
          <div className={`border rounded-2xl p-5 space-y-3 ${t.card}`}>
            <p className="font-semibold">Novo agendamento manual</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm ${t.input}`} />
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm ${t.input}`} />
              <input placeholder="Nome do contato" value={newContactName} onChange={e => setNewContactName(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm ${t.input}`} />
              <input placeholder="Número (com DDD)" value={newContactNumber} onChange={e => setNewContactNumber(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm ${t.input}`} />
            </div>
            {(professionals.length > 0 || services.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {professionals.length > 0 && (
                  <select value={newProfessionalId} onChange={e => setNewProfessionalId(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm ${t.input}`}>
                    <option value="">Sem profissional específico</option>
                    {professionals.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                {services.length > 0 && (
                  <select value={newServiceId} onChange={e => setNewServiceId(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm ${t.input}`}>
                    <option value="">Sem serviço específico</option>
                    {services.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min)</option>)}
                  </select>
                )}
              </div>
            )}
            <input placeholder="Observações (opcional)" value={newNotes} onChange={e => setNewNotes(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm ${t.input}`} />
            {newError && <p className="text-sm text-red-400">{newError}</p>}
            <button onClick={handleCreateAppointment} className="bg-green-700 hover:bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-medium">Salvar</button>
          </div>
        )}

        {showTeam && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`border rounded-2xl p-5 space-y-3 ${t.card}`}>
              <p className="font-semibold">Profissionais</p>
              <p className={`text-xs ${t.secondary}`}>Cada profissional tem sua própria agenda. Se não cadastrar nenhum, o agendamento usa a disponibilidade geral configurada acima.</p>
              <div className="space-y-2">
                {professionals.map(p => (
                  <ProfessionalRow key={p.id} professional={p} onUpdated={loadProfessionals} onDeleted={loadProfessionals} t={t} />
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <input placeholder="Nome do profissional" value={newProfessionalName} onChange={e => setNewProfessionalName(e.target.value)} className={`flex-1 min-w-[140px] border rounded-xl px-3 py-2 text-sm ${t.input}`} />
                <input placeholder="WhatsApp (opcional)" value={newProfessionalPhone} onChange={e => setNewProfessionalPhone(e.target.value)} className={`w-40 border rounded-xl px-3 py-2 text-sm ${t.input}`} />
                <button onClick={handleAddProfessional} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium">Adicionar</button>
              </div>
              <p className={`text-xs ${t.muted}`}>Com o WhatsApp preenchido, o profissional recebe aviso de cada novo agendamento. O botão "Link da agenda" gera a página que ele pode adicionar à tela inicial do celular.</p>
            </div>

            <div className={`border rounded-2xl p-5 space-y-3 ${t.card}`}>
              <p className="font-semibold">Serviços</p>
              <p className={`text-xs ${t.secondary}`}>Cada serviço tem sua própria duração. Se não cadastrar nenhum, o agendamento usa a duração padrão configurada acima.</p>

              <div>
                <label className={`text-xs ${t.secondary} block mb-1`}>Ícone na página de agendamento</label>
                <select
                  value={agendamentoIcone ?? ""}
                  onChange={e => setAgendamentoIcone(e.target.value || null)}
                  className={`w-full border rounded-xl px-3 py-2 text-sm ${t.input}`}
                >
                  <option value="">Automático (pelo segmento do agente)</option>
                  {ICON_OPTIONS.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
                <button onClick={handleSaveSettings} disabled={savingSettings} className="mt-2 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50">
                  {savingSettings ? "Salvando..." : "Salvar ícone"}
                </button>
              </div>

              <div className="space-y-2">
                {services.map(s => (
                  <div key={s.id} className={`border rounded-xl p-3 flex items-center justify-between gap-2 ${t.innerCard}`}>
                    <p className={`text-sm font-medium ${!s.active ? `${t.secondary} line-through` : ""}`}>{s.name} <span className={`font-normal ${t.secondary}`}>({s.durationMinutes}min)</span></p>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => handleToggleService(s)} className={`${t.subtitle} hover:opacity-80`}>{s.active ? "Desativar" : "Ativar"}</button>
                      <button onClick={() => handleDeleteService(s)} className="text-red-400 hover:text-red-300">Remover</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="Nome do serviço" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} className={`flex-1 border rounded-xl px-3 py-2 text-sm ${t.input}`} />
                <input type="number" min={5} max={480} value={newServiceDuration} onChange={e => setNewServiceDuration(Math.max(5, Number(e.target.value)))} className={`w-20 border rounded-xl px-3 py-2 text-sm ${t.input}`} />
                <button onClick={handleAddService} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium">Adicionar</button>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className={`border rounded-2xl p-5 space-y-4 ${t.card}`}>
            {(agendaAccessToken || bookingSlug) && (
              <div className="flex gap-2 flex-wrap">
                {agendaAccessToken && (
                  <button
                    onClick={copyClinicAgendaLink}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium text-purple-400 ${t.pillBg}`}
                    title="Página PWA com todos os agendamentos, para acompanhar no celular"
                  >
                    {agendaLinkCopied ? "Copiado!" : "Link da agenda geral"}
                  </button>
                )}
                {bookingSlug && (
                  <button
                    onClick={copyBookingLink}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium text-blue-400 ${t.pillBg}`}
                    title="Página pública onde o cliente escolhe o serviço e o horário sozinho"
                  >
                    {bookingLinkCopied ? "Copiado!" : "Link de agendamento"}
                  </button>
                )}
              </div>
            )}

            <SettingsSection
              title="Como funciona o agendamento"
              subtitle="Ativar pela IA e escolher o modo de atendimento"
              open={openSettingsSections.has("modo")}
              onToggle={() => toggleSettingsSection("modo")}
              t={t}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={schedulingEnabled} onChange={e => setSchedulingEnabled(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium">Ativar agendamento automático pelo agente de IA</span>
              </label>

              <div className={`border rounded-xl p-4 space-y-2 ${t.border}`}>
                <p className="text-sm font-medium">Como a IA agenda pelo WhatsApp</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="modoAgendamento"
                    checked={!schedulingViaLink}
                    onChange={() => setSchedulingViaLink(false)}
                    className="w-4 h-4 mt-0.5"
                  />
                  <div>
                    <p className="text-sm">Por mensagem, na conversa</p>
                    <p className={`text-xs ${t.secondary}`}>A IA consulta os horários, oferece opções e confirma o agendamento dentro do próprio WhatsApp.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="modoAgendamento"
                    checked={schedulingViaLink}
                    onChange={() => setSchedulingViaLink(true)}
                    className="w-4 h-4 mt-0.5"
                  />
                  <div>
                    <p className="text-sm">Enviando o link de agendamento</p>
                    <p className={`text-xs ${t.secondary}`}>A IA envia o link da página pública, onde o cliente escolhe serviço e horário sozinho e confirma na hora. Cancelamento pelo lembrete continua funcionando na conversa.</p>
                  </div>
                </label>
              </div>
            </SettingsSection>

            <SettingsSection
              title="Duração e capacidade"
              subtitle="Tempo de cada atendimento, vagas simultâneas e lembretes"
              open={openSettingsSections.has("duracao")}
              onToggle={() => toggleSettingsSection("duracao")}
              t={t}
            >
              <div>
                <label className={`text-sm block mb-1 ${t.subtitle}`}>Duração de cada atendimento (minutos)</label>
                <input
                  type="number" min={5} max={480} value={slotDurationMinutes}
                  onChange={e => setSlotDurationMinutes(Math.max(5, Number(e.target.value)))}
                  className={`w-32 border rounded-xl px-3 py-2 text-sm ${t.input}`}
                />
              </div>

              <div>
                <label className={`text-sm block mb-1 ${t.subtitle}`}>Atendimentos simultâneos</label>
                <input
                  type="number" min={1} max={50} value={vagasSimultaneas}
                  onChange={e => setVagasSimultaneas(Math.min(50, Math.max(1, Number(e.target.value))))}
                  className={`w-32 border rounded-xl px-3 py-2 text-sm ${t.input}`}
                />
                <p className={`text-xs mt-1 ${t.secondary}`}>
                  Quantos clientes podem ser atendidos no mesmo horário quando não há profissionais cadastrados.
                  Ex: lava-jato com 3 vagas atende 3 carros ao mesmo tempo. Com profissionais, a capacidade é de 1 atendimento por profissional.
                </p>
              </div>

              <div>
                <label className={`text-sm block mb-1 ${t.subtitle}`}>Enviar lembrete de confirmação quantas horas antes do compromisso</label>
                <input
                  type="number" min={1} max={168} value={appointmentReminderHours}
                  onChange={e => setAppointmentReminderHours(Math.max(1, Number(e.target.value)))}
                  className={`w-32 border rounded-xl px-3 py-2 text-sm ${t.input}`}
                />
                <p className={`text-xs mt-1 ${t.secondary}`}>O agente pergunta se o cliente confirma presença. Se ele disser que não pode ir, a IA cancela e já oferece reagendar.</p>
              </div>

              <div className={`border rounded-xl p-4 ${t.border}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agendarAteEncerramento}
                    onChange={e => setAgendarAteEncerramento(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium">Aceitar agendamentos até o horário de encerramento</p>
                    <p className={`text-xs ${t.secondary}`}>
                      Serviços longos podem começar perto do fechamento mesmo que terminem depois dele. Ex: funcionamento até 18h, serviço de 2h pode começar às 17h. Desligado: o serviço precisa terminar dentro do horário.
                    </p>
                  </div>
                </label>
              </div>
            </SettingsSection>

            <SettingsSection
              title="Regras para a IA"
              subtitle="Informações pedidas, restrições e atendimento especial"
              open={openSettingsSections.has("regras")}
              onToggle={() => toggleSettingsSection("regras")}
              t={t}
            >
              <div>
                <label className={`text-sm block mb-1 ${t.subtitle}`}>
                  Informações necessárias para o agendamento <span className={t.muted}>(opcional)</span>
                </label>
                <textarea
                  value={requisitosAgendamento}
                  onChange={e => setRequisitosAgendamento(e.target.value)}
                  rows={3}
                  placeholder="Ex: nome completo, convênio, tipo de consulta, nome do pet e raça..."
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600 ${t.input}`}
                  maxLength={500}
                />
                <p className={`text-xs mt-1 ${t.secondary}`}>Depois que o cliente escolher a data e o horário, o agente envia uma mensagem pedindo essas informações — e só confirma o agendamento quando o cliente responder.</p>
              </div>

              <div>
                <label className={`text-sm block mb-1 ${t.subtitle}`}>
                  O que NÃO fazer no agendamento <span className={t.muted}>(opcional)</span>
                </label>
                <textarea
                  value={restricoesAgendamento}
                  onChange={e => setRestricoesAgendamento(e.target.value)}
                  rows={3}
                  placeholder="Ex: não agendar para menores de 18 anos sem responsável, não aceitar agendamentos no mesmo dia, não remarcar mais de uma vez..."
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600 ${t.input}`}
                  maxLength={500}
                />
                <p className={`text-xs mt-1 ${t.secondary}`}>O agente vai seguir essas restrições durante toda a conversa de agendamento.</p>
              </div>

              <div className={`border rounded-xl p-4 space-y-3 ${t.border}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={atendimentoEspecialEnabled}
                    onChange={e => setAtendimentoEspecialEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium">Permitir atendimento especial fora do horário comercial</p>
                    <p className={`text-xs ${t.secondary}`}>Quando ativo, o agente informa ao cliente que é possível verificar um horário especial fora da disponibilidade normal.</p>
                  </div>
                </label>
                {atendimentoEspecialEnabled && (
                  <div>
                    <label className={`text-sm block mb-1 ${t.subtitle}`}>
                      Condições do atendimento especial <span className={t.muted}>(opcional)</span>
                    </label>
                    <textarea
                      value={atendimentoEspecialDescricao}
                      onChange={e => setAtendimentoEspecialDescricao(e.target.value)}
                      rows={2}
                      placeholder="Ex: somente emergências, sujeito a confirmação por telefone, taxa adicional de R$ 50..."
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600 ${t.input}`}
                      maxLength={500}
                    />
                  </div>
                )}
              </div>

              <div className={`border rounded-xl p-4 ${t.border}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={askProfessionalEnabled}
                    onChange={e => setAskProfessionalEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium">Perguntar com qual profissional o cliente quer agendar</p>
                    <p className={`text-xs ${t.secondary}`}>
                      Vale quando há mais de um profissional. Desligado: o agente oferece os horários de toda a equipe e o sistema atribui automaticamente a um profissional livre.
                    </p>
                  </div>
                </label>
              </div>
            </SettingsSection>

            <SettingsSection
              title="Cobrança de sinal (Pix)"
              subtitle="Exigir pagamento para confirmar o horário"
              open={openSettingsSections.has("cobranca")}
              onToggle={() => toggleSettingsSection("cobranca")}
              t={t}
            >
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agendamentoCobrancaEnabled}
                    disabled={!hasAsaasApiKey}
                    onChange={e => setAgendamentoCobrancaEnabled(e.target.checked)}
                    className="w-4 h-4 disabled:opacity-50"
                  />
                  <div>
                    <p className="text-sm font-medium">Cobrar sinal para confirmar (Pix)</p>
                    <p className={`text-xs ${t.secondary}`}>
                      O cliente paga um Pix do valor abaixo na página pública pra confirmar o horário. Usa a conta Asaas
                      configurada em Comércio. Se o pagamento não cair em 30 minutos, o horário volta a ficar livre.
                      Pagamentos recebidos fora do prazo (horário já ocupado por outra pessoa) precisam de estorno manual no Asaas.
                    </p>
                  </div>
                </label>
                {!hasAsaasApiKey && (
                  <p className="text-xs text-amber-400">Configure a chave da API do Asaas na aba Comércio antes de ativar.</p>
                )}
                {agendamentoCobrancaEnabled && hasAsaasApiKey && (
                  <div>
                    <label className={`text-sm block mb-1 ${t.subtitle}`}>Valor do sinal (R$)</label>
                    <input
                      type="number" min={0} step={0.01} value={agendamentoSinalValor}
                      onChange={e => setAgendamentoSinalValor(Math.max(0, Number(e.target.value)))}
                      className={`w-32 border rounded-xl px-3 py-2 text-sm ${t.input}`}
                    />
                  </div>
                )}
              </div>
            </SettingsSection>

            <SettingsSection
              title="Campos do formulário"
              subtitle="Perguntas extras na página pública de agendamento"
              open={openSettingsSections.has("campos")}
              onToggle={() => toggleSettingsSection("campos")}
              t={t}
            >
              <div className="space-y-3">
                <p className={`text-xs ${t.secondary}`}>
                  Nome e WhatsApp são sempre pedidos. Adicione campos extras que o cliente preenche antes de confirmar — as respostas aparecem nas observações do agendamento.
                </p>
                {bookingFormFields.length > 0 && (
                  <div className="space-y-1.5">
                    {bookingFormFields.map((f, i) => (
                      <div key={i} className={`flex items-center gap-3 border rounded-xl px-3 py-2 ${t.innerCard}`}>
                        <p className="flex-1 text-sm truncate">{f.label}</p>
                        <label className={`flex items-center gap-1.5 text-xs cursor-pointer flex-shrink-0 ${t.subtitle}`}>
                          <input
                            type="checkbox"
                            checked={f.obrigatorio}
                            onChange={e => setBookingFormFields(fields => fields.map((x, j) => j === i ? { ...x, obrigatorio: e.target.checked } : x))}
                            className="w-3.5 h-3.5"
                          />
                          Obrigatório
                        </label>
                        <button
                          onClick={() => setBookingFormFields(fields => fields.filter((_, j) => j !== i))}
                          className={`hover:text-red-400 text-xs flex-shrink-0 ${t.muted}`}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {bookingFormFields.length < 10 && (
                  <div className="flex gap-2">
                    <input
                      value={newFieldLabel}
                      onChange={e => setNewFieldLabel(e.target.value)}
                      placeholder="Ex: Convênio, Placa do carro, Nome do pet..."
                      maxLength={60}
                      className={`flex-1 border rounded-xl px-3 py-2 text-sm ${t.input}`}
                    />
                    <button
                      onClick={() => {
                        const label = newFieldLabel.trim();
                        if (!label) return;
                        setBookingFormFields(fields => [...fields, { label, obrigatorio: true }]);
                        setNewFieldLabel("");
                      }}
                      disabled={!newFieldLabel.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium"
                    >
                      Adicionar
                    </button>
                  </div>
                )}
              </div>
            </SettingsSection>

            <SettingsSection
              title="Disponibilidade"
              subtitle="Dias e horários em que o agendamento fica aberto"
              open={openSettingsSections.has("disponibilidade")}
              onToggle={() => toggleSettingsSection("disponibilidade")}
              t={t}
            >
              <p className={`text-sm ${t.subtitle}`}>
                Dias e horários de disponibilidade {professionals.length > 0 && <span className="text-xs">(usado só para quem não tem profissional atribuído)</span>}
              </p>
              <AvailabilityEditor rules={rules} onChange={setRules} t={t} />
            </SettingsSection>

            <div className="flex items-center gap-3">
              <button onClick={handleSaveSettings} disabled={savingSettings} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-medium">
                {savingSettings ? "Salvando..." : "Salvar configurações"}
              </button>
              <p className={`text-xs ${t.muted}`}>Lembre de clicar em Salvar depois de mudar qualquer campo acima.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => setWeekStart(d => new Date(d.getTime() - 7 * 86400000))} className={`text-sm px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${t.navButton}`}><ArrowLeft size={14} /> Semana anterior</button>
          <div className="flex items-center gap-3">
            <p className={`text-sm ${t.subtitle}`}>{days[0].toLocaleDateString("pt-BR")} – {days[6].toLocaleDateString("pt-BR")}</p>
            <button onClick={() => setWeekStart(startOfWeek(new Date()))} className={`text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg border ${t.toggleBar}`}>Hoje</button>
          </div>
          <button onClick={() => setWeekStart(d => new Date(d.getTime() + 7 * 86400000))} className={`text-sm px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${t.navButton}`}>Próxima semana <ArrowRight size={14} /></button>
        </div>

        <WeekTimeline
          days={days}
          appointments={appointments}
          rules={rules}
          loading={loadingAppointments}
          onSelect={setSelectedAppointment}
          t={t}
        />
      </div>

      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAppointment(null)}>
          <div className={`border rounded-2xl p-5 w-full max-w-sm space-y-3 ${t.card}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`text-xs capitalize ${t.secondary}`}>
                  {new Date(selectedAppointment.scheduledAt).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}
                </p>
                <p className="text-lg font-semibold">
                  {new Date(selectedAppointment.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  <span className={`text-sm font-normal ${t.secondary}`}> · {selectedAppointment.durationMinutes}min</span>
                </p>
              </div>
              <button onClick={() => setSelectedAppointment(null)} className={`${t.secondary} hover:opacity-80`}><X size={18} /></button>
            </div>
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_LABEL[selectedAppointment.status].color}`}>
              {STATUS_LABEL[selectedAppointment.status].label}
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">{selectedAppointment.contactName || "Sem nome"}</p>
              <p className={`text-xs font-mono ${t.secondary}`}>+{selectedAppointment.contactNumber}</p>
            </div>
            {(selectedAppointment.professional || selectedAppointment.service) && (
              <p className={`text-sm ${t.subtitle}`}>{[selectedAppointment.service?.name, selectedAppointment.professional?.name].filter(Boolean).join(" · ")}</p>
            )}
            {selectedAppointment.notes && (
              <p className={`text-sm whitespace-pre-wrap ${t.subtitle}`}>{selectedAppointment.notes}</p>
            )}
            {selectedAppointment.status === "CONFIRMADO" && (
              <button
                onClick={() => { handleCancel(selectedAppointment.id); setSelectedAppointment(null); }}
                className="text-sm text-red-400 hover:text-red-300 border border-red-900/50 rounded-lg px-3 py-1.5"
              >
                Cancelar agendamento
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WeekTimeline({
  days, appointments, rules, loading, onSelect, t,
}: {
  days: Date[];
  appointments: Appointment[];
  rules: Record<number, { enabled: boolean; start: string; end: string }>;
  loading: boolean;
  onSelect: (a: Appointment) => void;
  t: typeof THEMES["dark"];
}) {
  const { startHour, endHour } = computeHourBounds(rules, appointments);
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const todayStr = fmtDate(new Date());
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNowLine = nowMin >= startHour * 60 && nowMin <= endHour * 60;

  return (
    <div className={`border rounded-2xl overflow-hidden ${t.card}`}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 760 }}>
          <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
            <div />
            {days.map((day, i) => {
              const isToday = fmtDate(day) === todayStr;
              return (
                <div key={i} className={`text-center py-2 border-l ${t.border} ${isToday ? t.headerCellToday : ""}`}>
                  <p className="text-xs font-semibold">{DIAS_ABREV[i]}</p>
                  <p className={`text-sm ${isToday ? "text-blue-400 font-bold" : t.secondary}`}>{day.getDate()}</p>
                </div>
              );
            })}
          </div>

          {loading ? (
            <p className={`text-xs px-4 py-6 ${t.muted}`}>Carregando...</p>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
              <div className="relative" style={{ height: totalHeight }}>
                {hours.map(h => (
                  <div
                    key={h}
                    className={`absolute right-1.5 text-[10px] -translate-y-1/2 ${t.hourLabel}`}
                    style={{ top: (h - startHour) * HOUR_HEIGHT }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              {days.map((day, i) => {
                const dayStr = fmtDate(day);
                const isToday = dayStr === todayStr;
                const dayAppointments = layoutDayAppointments(appointments.filter(a => fmtDate(new Date(a.scheduledAt)) === dayStr));
                return (
                  <div key={i} className={`relative border-l ${t.border}`} style={{ height: totalHeight }}>
                    {hours.slice(1, -1).map(h => (
                      <div key={h} className={`absolute left-0 right-0 border-t ${t.gridLine}`} style={{ top: (h - startHour) * HOUR_HEIGHT }} />
                    ))}
                    {isToday && showNowLine && (
                      <div className="absolute left-0 right-0 border-t-2 border-red-500 z-10" style={{ top: (nowMin - startHour * 60) / 60 * HOUR_HEIGHT }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 -mt-[3px] -ml-0.5" />
                      </div>
                    )}
                    {dayAppointments.map(a => {
                      const top = (a.startMin - startHour * 60) / 60 * HOUR_HEIGHT;
                      const height = Math.max((a.endMin - a.startMin) / 60 * HOUR_HEIGHT, 18);
                      const widthPct = 100 / a.cols;
                      return (
                        <button
                          key={a.id}
                          onClick={() => onSelect(a)}
                          className={`absolute rounded-md border text-left px-1.5 overflow-hidden ${STATUS_BLOCK[a.status]}`}
                          style={{ top, height, left: `${a.col * widthPct}%`, width: `calc(${widthPct}% - 2px)` }}
                        >
                          <p className="text-[10px] font-semibold leading-tight truncate">
                            {new Date(a.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {a.contactName || a.contactNumber}
                          </p>
                          {height > 32 && (a.professional || a.service) && (
                            <p className="text-[9px] text-gray-200/80 truncate">{[a.service?.name, a.professional?.name].filter(Boolean).join(" · ")}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
