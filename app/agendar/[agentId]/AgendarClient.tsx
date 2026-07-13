"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, CalendarCheck, ChevronLeft, Clock, Loader2, MessageCircle, Scissors, User } from "lucide-react";

type Service = { id: string; name: string; durationMinutes: number };
type Professional = { id: string; name: string };
type SlotDay = { date: string; weekday: string; slots: string[] };
type Confirmado = { scheduledAt: string; durationMinutes: number; serviceName: string | null; professionalName: string | null };

type Step = "servico" | "profissional" | "horario" | "dados" | "confirmado";

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

export function AgendarClient({ agentId, businessName, whatsappNumber, logo, services, professionals, askProfessionalEnabled, defaultDurationMinutes }: {
  agentId: string;
  businessName: string;
  whatsappNumber: string | null;
  logo: string | null;
  services: Service[];
  professionals: Professional[];
  askProfessionalEnabled: boolean;
  defaultDurationMinutes: number;
}) {
  const temServicos = services.length > 0;
  const pedeProfissional = professionals.length > 1 && askProfessionalEnabled;

  const [step, setStep] = useState<Step>(temServicos ? "servico" : (pedeProfissional ? "profissional" : "horario"));
  const [service, setService] = useState<Service | null>(services.length === 1 ? services[0] : null);
  const [professional, setProfessional] = useState<Professional | null>(null);

  const [days, setDays] = useState<SlotDay[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<Confirmado | null>(null);

  const carregarSlots = useCallback(async () => {
    setLoadingSlots(true);
    setDays(null);
    setSelectedDate(null);
    setSelectedTime(null);
    try {
      const qs = new URLSearchParams();
      if (service) qs.set("serviceId", service.id);
      if (professional) qs.set("professionalId", professional.id);
      const res = await fetch(`/api/agendar/${agentId}/slots?${qs}`);
      const data = await res.json();
      const dias: SlotDay[] = res.ok ? data.days ?? [] : [];
      setDays(dias);
      if (dias.length > 0) setSelectedDate(dias[0].date);
    } catch {
      setDays([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [agentId, service, professional]);

  useEffect(() => {
    if (step === "horario") carregarSlots();
  }, [step, carregarSlots]);

  async function confirmar() {
    if (!selectedDate || !selectedTime || !nome.trim() || whatsapp.replace(/\D/g, "").length < 10) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/agendar/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service?.id,
          professionalId: professional?.id,
          date: selectedDate,
          time: selectedTime,
          nome: nome.trim(),
          whatsapp,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfirmado(data.appointment);
        setStep("confirmado");
        // Igual ao catálogo: já cai na conversa do WhatsApp da empresa com a confirmação.
        // Se o navegador bloquear o popup, o botão da tela de confirmação faz o mesmo.
        abrirWhatsApp();
      } else if (res.status === 409) {
        setErro("Este horário acabou de ser preenchido. Escolha outro.");
        setStep("horario");
      } else {
        setErro(data.error ?? "Não foi possível agendar. Tente novamente.");
      }
    } catch {
      setErro("Não foi possível agendar. Verifique sua conexão e tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  // Abre a conversa sem mensagem pronta — a confirmação enviada pela empresa já está lá,
  // então texto pré-preenchido só duplicaria a informação (e acionaria a IA à toa)
  function abrirWhatsApp() {
    if (!whatsappNumber) return;
    window.open(`https://wa.me/${whatsappNumber}`, "_blank");
  }

  function voltar() {
    setErro(null);
    if (step === "dados") setStep("horario");
    else if (step === "horario") setStep(pedeProfissional ? "profissional" : "servico");
    else if (step === "profissional") setStep("servico");
  }

  const podeVoltar = step !== "confirmado" && (
    (step === "profissional" && temServicos) ||
    (step === "horario" && (temServicos || pedeProfissional)) ||
    step === "dados"
  );

  const diaSelecionado = days?.find(d => d.date === selectedDate) ?? null;
  const duracao = service?.durationMinutes ?? defaultDurationMinutes;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {podeVoltar ? (
            <button onClick={voltar} className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100" aria-label="Voltar">
              <ChevronLeft size={20} />
            </button>
          ) : logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <Calendar size={20} className="text-blue-600" />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{businessName}</p>
            <p className="text-xs text-gray-500">Agendamento online</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {erro && step !== "confirmado" && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{erro}</div>
        )}

        {/* Passo: serviço */}
        {step === "servico" && (
          <>
            <h1 className="text-lg font-bold">Escolha o serviço</h1>
            <div className="space-y-2">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setService(s); setStep(pedeProfissional ? "profissional" : "horario"); }}
                  className={`w-full flex items-center justify-between gap-3 bg-white border rounded-2xl px-4 py-3.5 text-left transition-colors ${
                    service?.id === s.id ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0"><Scissors size={16} /></span>
                    <span className="font-medium text-sm truncate">{s.name}</span>
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0"><Clock size={12} /> {formatDuration(s.durationMinutes)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Passo: profissional */}
        {step === "profissional" && (
          <>
            <h1 className="text-lg font-bold">Com quem?</h1>
            <div className="space-y-2">
              {professionals.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setProfessional(p); setStep("horario"); }}
                  className={`w-full flex items-center gap-3 bg-white border rounded-2xl px-4 py-3.5 text-left transition-colors ${
                    professional?.id === p.id ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0"><User size={16} /></span>
                  <span className="font-medium text-sm">{p.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Passo: dia + horário */}
        {step === "horario" && (
          <>
            <h1 className="text-lg font-bold">Escolha o horário</h1>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : !days || days.length === 0 ? (
              <div className="text-center py-14 space-y-2">
                <Calendar size={36} className="mx-auto text-gray-300" />
                <p className="text-sm text-gray-500">Nenhum horário disponível nos próximos 14 dias.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
                  {days.map(d => (
                    <button
                      key={d.date}
                      onClick={() => { setSelectedDate(d.date); setSelectedTime(null); }}
                      className={`flex flex-col items-center flex-shrink-0 rounded-2xl border px-4 py-2.5 transition-colors ${
                        selectedDate === d.date ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-[11px] capitalize">{d.weekday}</span>
                      <span className="text-sm font-semibold">{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</span>
                    </button>
                  ))}
                </div>
                {diaSelecionado && (
                  <div className="grid grid-cols-4 gap-2">
                    {diaSelecionado.slots.map(t => (
                      <button
                        key={t}
                        onClick={() => { setSelectedTime(t); setStep("dados"); }}
                        className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors ${
                          selectedTime === t ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Passo: dados do cliente */}
        {step === "dados" && (
          <>
            <h1 className="text-lg font-bold">Seus dados</h1>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nome</label>
                <input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  maxLength={80}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">WhatsApp (com DDD)</label>
                <input
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value.replace(/[^\d\s()-]/g, ""))}
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                  maxLength={20}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">Você recebe a confirmação e o lembrete nesse número.</p>
              </div>
            </div>
          </>
        )}

        {/* Confirmado */}
        {step === "confirmado" && confirmado && (
          <div className="text-center pt-10 space-y-4">
            <span className="inline-flex p-4 rounded-full bg-green-50 text-green-600"><CalendarCheck size={40} /></span>
            <h1 className="text-xl font-bold">Agendamento confirmado</h1>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 text-sm text-left space-y-1.5 max-w-xs mx-auto">
              {confirmado.serviceName && <p><span className="text-gray-500">Serviço:</span> <span className="font-medium">{confirmado.serviceName}</span></p>}
              {confirmado.professionalName && <p><span className="text-gray-500">Profissional:</span> <span className="font-medium">{confirmado.professionalName}</span></p>}
              <p>
                <span className="text-gray-500">Quando:</span>{" "}
                <span className="font-medium">
                  {new Date(confirmado.scheduledAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                  {" às "}
                  {new Date(confirmado.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </p>
              <p><span className="text-gray-500">Duração:</span> <span className="font-medium">{formatDuration(confirmado.durationMinutes)}</span></p>
            </div>
            {whatsappNumber && (
              <button
                onClick={abrirWhatsApp}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-2xl px-5 py-3 text-sm transition-colors"
              >
                <MessageCircle size={16} />
                Continuar no WhatsApp
              </button>
            )}
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Enviamos a confirmação no seu WhatsApp. Precisa remarcar? É só chamar a empresa por lá.
            </p>
          </div>
        )}
      </main>

      {/* Barra fixa de resumo + confirmar (só no passo de dados) */}
      {step === "dados" && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-lg mx-auto space-y-2.5">
            <p className="text-xs text-gray-500">
              {service ? `${service.name} · ` : ""}
              {professional ? `${professional.name} · ` : ""}
              {selectedDate ? formatDateLong(selectedDate) : ""} às {selectedTime} · {formatDuration(duracao)}
            </p>
            <button
              onClick={confirmar}
              disabled={enviando || !nome.trim() || whatsapp.replace(/\D/g, "").length < 10}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-2xl py-3.5 text-sm transition-colors"
            >
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <CalendarCheck size={16} />}
              {enviando ? "Confirmando..." : "Confirmar agendamento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
