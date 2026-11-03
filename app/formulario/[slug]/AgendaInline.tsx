"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, MapPin } from "lucide-react";

// Agendamento ao final do formulário/quiz: calendário e horários na própria tela (estilo agenda de
// demonstração). Os horários livres vêm de /api/formularios/[slug]/agenda; ao confirmar, a reunião
// é marcada na agenda do agente e o lead recebe a confirmação no WhatsApp.

type Dia = { date: string; weekday: string; slots: string[] };

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

const chave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function AgendaInline({ slug, submissionId, accent, titulo, subtitulo, empresa, onAgendado, onPular }: {
  slug: string; submissionId: string; accent: string;
  titulo: string; subtitulo: string; empresa: string | null;
  onAgendado: (quando: string) => void;
  onPular: () => void;
}) {
  const [dias, setDias] = useState<Map<string, string[]> | null>(null);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [mes, setMes] = useState<Date | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState<Date | null>(null);

  function carregar() {
    fetch(`/api/formularios/${slug}/agenda`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: { dias: Dia[] }) => {
        const m = new Map(d.dias.map(x => [x.date, x.slots]));
        setDias(m);
        const primeiro = d.dias[0]?.date;
        setDia(atual => (atual && m.has(atual) ? atual : primeiro ?? null));
        setMes(atual => atual ?? (primeiro ? new Date(`${primeiro}T12:00:00`) : new Date()));
      })
      .catch(() => setErroCarregar(true));
  }

  useEffect(() => {
    const t = setTimeout(() => { setAgora(new Date()); carregar(); }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const celulas = useMemo(() => {
    if (!mes) return [];
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    return [...Array(inicio.getDay()).fill(null), ...Array.from({ length: total }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1))] as (Date | null)[];
  }, [mes]);

  const ultimoDia = dias ? [...dias.keys()].pop() : undefined;
  const podeVoltar = mes && agora ? mes.getFullYear() * 12 + mes.getMonth() > agora.getFullYear() * 12 + agora.getMonth() : false;
  const podeAvancar = mes && ultimoDia ? mes.getFullYear() * 12 + mes.getMonth() < Number(ultimoDia.slice(0, 4)) * 12 + Number(ultimoDia.slice(5, 7)) - 1 : false;
  const horarios = dia ? dias?.get(dia) ?? [] : [];
  const diaData = dia ? new Date(`${dia}T12:00:00`) : null;

  async function confirmar() {
    if (!dia || !hora || enviando) return;
    setEnviando(true);
    setErro(null);
    const res = await fetch(`/api/formularios/${slug}/agenda`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId, date: dia, time: hora }),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setEnviando(false);
    if (res?.ok) { onAgendado(d.quando ?? `${dia} ${hora}`); return; }
    setErro(d?.error ?? "Não foi possível agendar. Tente de novo.");
    setHora(null);
    if (res?.status === 409) carregar();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{titulo}</h2>
        {subtitulo && <p className="mt-1 text-slate-500">{subtitulo}</p>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-4 flex items-center gap-3 text-white" style={{ backgroundColor: accent }}>
          <CalendarDays size={26} className="flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-lg leading-tight truncate">{empresa ? `Agenda ${empresa}` : "Agenda"}</p>
            {subtitulo && <p className="text-sm opacity-80 truncate">{subtitulo}</p>}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {agora && (
            <p className="mx-auto w-fit flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm text-slate-700">
              <MapPin size={14} /> Hoje é {DIAS[agora.getDay()]}, {String(agora.getHours()).padStart(2, "0")}:{String(agora.getMinutes()).padStart(2, "0")}
            </p>
          )}

          {erroCarregar ? (
            <p className="py-8 text-center text-sm text-slate-500">Não foi possível carregar os horários agora.</p>
          ) : !dias || !mes ? (
            <p className="py-8 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Carregando horários...</p>
          ) : dias.size === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Não há horários disponíveis nos próximos dias.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} disabled={!podeVoltar} aria-label="Mês anterior" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30">
                  <ChevronLeft size={18} />
                </button>
                <p className="font-semibold text-slate-900">{MESES[mes.getMonth()]} {mes.getFullYear()}</p>
                <button type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} disabled={!podeAvancar} aria-label="Próximo mês" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30">
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {SEMANA.map((s, i) => <span key={i} className="py-1 text-xs font-medium text-slate-400">{s}</span>)}
                {celulas.map((d, i) => {
                  if (!d) return <span key={i} />;
                  const k = chave(d);
                  const livre = dias.has(k);
                  const sel = k === dia;
                  return (
                    <button
                      key={i} type="button" disabled={!livre} onClick={() => { setDia(k); setHora(null); setErro(null); }}
                      className={`mx-auto w-10 h-10 rounded-full text-sm transition-colors ${sel ? "text-white font-semibold shadow-md" : livre ? "text-slate-900 font-medium hover:bg-slate-100" : "text-slate-300"}`}
                      style={sel ? { backgroundColor: accent } : undefined}
                      aria-pressed={sel}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>

              {diaData && (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-600">Horários para {diaData.getDate()} de {MESES[diaData.getMonth()].toLowerCase()}, {DIAS[diaData.getDay()]}</p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-500"><Clock size={12} /> Horário de Brasília</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {horarios.map(h => (
                      <button
                        key={h} type="button" onClick={() => { setHora(h); setErro(null); }}
                        className={`rounded-xl border py-3 text-base font-medium transition-colors ${hora === h ? "text-white" : "border-slate-200 text-slate-800 hover:border-slate-400"}`}
                        style={hora === h ? { backgroundColor: accent, borderColor: accent } : undefined}
                        aria-pressed={hora === h}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {erro && <p className="text-sm text-red-600 text-center">{erro}</p>}

              {hora && diaData ? (
                <button type="button" onClick={confirmar} disabled={enviando} className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-lg font-semibold text-white disabled:opacity-60" style={{ backgroundColor: accent }}>
                  {enviando ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Confirmar {DIAS[diaData.getDay()].split("-")[0]}, {diaData.getDate()}/{String(diaData.getMonth() + 1).padStart(2, "0")} às {hora}
                </button>
              ) : (
                <p className="text-center text-sm text-slate-500">Toque em um horário para agendar</p>
              )}
            </>
          )}
        </div>
      </div>

      <button type="button" onClick={onPular} className="w-full text-center text-sm text-slate-500 hover:text-slate-800 py-1">Prefiro não agendar agora</button>
    </div>
  );
}
