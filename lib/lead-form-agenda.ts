// Agendamento ao final do formulário/quiz — mesmo modelo da agenda de demonstração da FluxVenda
// (lib/demo-scheduling.ts): poucos horários fixos nos dias escolhidos, sem serviço nem
// profissional. Configurado por formulário (LeadForm.bookingConfig); a reunião vira um
// Appointment na agenda do agente do formulário. Funções puras — usadas no editor, na página
// pública e na API.

export type AgendaFormulario = {
  titulo: string;    // título da etapa ("Escolha o melhor horário")
  subtitulo: string; // ex: "Sua reunião de apresentação"
  duracao: number;   // minutos
  horarios: string[]; // "HH:MM", em ordem
  dias: number[];    // dias da semana (0 = domingo … 6 = sábado)
  mensagem: string;  // confirmação no WhatsApp — {{nome}}, {{data}} e {{empresa}} (ver montarConfirmacao)
};

export const MENSAGEM_CONFIRMACAO_PADRAO =
  "Oi, {{nome}}! Seu horário está confirmado ✅\n\n📅 {{data}}\n📍 {{empresa}}\n\nSe precisar remarcar, é só responder esta mensagem.";

export const AGENDA_PADRAO: AgendaFormulario = {
  titulo: "Escolha o melhor horário",
  subtitulo: "Sua reunião gratuita",
  duracao: 30,
  horarios: ["09:00", "11:00", "14:00", "16:00"],
  dias: [1, 2, 3, 4, 5],
  mensagem: MENSAGEM_CONFIRMACAO_PADRAO,
};

export const AGENDA_DURACOES = [15, 20, 30, 40, 45, 60, 90];
export const AGENDA_JANELA_DIAS = 30;
const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Lê o JSON do banco (ou do editor) com segurança: o que faltar ou vier inválido usa o padrão
export function normalizarAgenda(v: unknown): AgendaFormulario {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Record<keyof AgendaFormulario, unknown>>;
  const horarios = Array.isArray(o.horarios) ? [...new Set(o.horarios.filter((h): h is string => typeof h === "string" && HORA.test(h)))].sort() : [];
  const dias = Array.isArray(o.dias) ? [...new Set(o.dias.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [];
  return {
    titulo: typeof o.titulo === "string" && o.titulo.trim() ? o.titulo.trim().slice(0, 80) : AGENDA_PADRAO.titulo,
    subtitulo: typeof o.subtitulo === "string" ? o.subtitulo.trim().slice(0, 120) : AGENDA_PADRAO.subtitulo,
    duracao: typeof o.duracao === "number" && AGENDA_DURACOES.includes(o.duracao) ? o.duracao : AGENDA_PADRAO.duracao,
    horarios: horarios.length ? horarios : AGENDA_PADRAO.horarios,
    dias: dias.length ? dias : AGENDA_PADRAO.dias,
    mensagem: typeof o.mensagem === "string" && o.mensagem.trim() ? o.mensagem.trim().slice(0, 1000) : MENSAGEM_CONFIRMACAO_PADRAO,
  };
}

type Ocupado = { scheduledAt: Date; durationMinutes: number };

const pad = (n: number) => n.toString().padStart(2, "0");

function colide(inicio: Date, duracao: number, ocupados: Ocupado[]) {
  const fim = new Date(inicio.getTime() + duracao * 60000);
  return ocupados.some(o => inicio < new Date(o.scheduledAt.getTime() + o.durationMinutes * 60000) && fim > o.scheduledAt);
}

// Próximos dias (dentro da janela) com os horários ainda livres. Roda no servidor, que está no
// horário de Brasília (instrumentation.ts) — as datas saem como "AAAA-MM-DD" desse fuso.
export function horariosLivres(agenda: AgendaFormulario, ocupados: Ocupado[], agora = new Date(), janela = AGENDA_JANELA_DIAS) {
  const dias: { date: string; weekday: string; slots: string[] }[] = [];
  for (let d = 0; d < janela; d++) {
    const dia = new Date(agora);
    dia.setDate(dia.getDate() + d);
    dia.setHours(0, 0, 0, 0);
    if (!agenda.dias.includes(dia.getDay())) continue;
    const slots = agenda.horarios.filter(h => {
      const [hh, mm] = h.split(":").map(Number);
      const inicio = new Date(dia);
      inicio.setHours(hh, mm, 0, 0);
      return inicio > agora && !colide(inicio, agenda.duracao, ocupados);
    });
    if (slots.length) dias.push({ date: `${dia.getFullYear()}-${pad(dia.getMonth() + 1)}-${pad(dia.getDate())}`, weekday: DIAS_SEMANA[dia.getDay()], slots });
  }
  return dias;
}

// Revalida no servidor o horário escolhido (a lista da tela pode estar desatualizada)
export function horarioDisponivel(agenda: AgendaFormulario, ocupados: Ocupado[], inicio: Date, agora = new Date(), janela = AGENDA_JANELA_DIAS) {
  if (Number.isNaN(inicio.getTime()) || inicio <= agora) return false;
  if (inicio.getTime() - agora.getTime() > (janela + 1) * 86400000) return false;
  if (!agenda.dias.includes(inicio.getDay())) return false;
  if (!agenda.horarios.includes(`${pad(inicio.getHours())}:${pad(inicio.getMinutes())}`)) return false;
  return !colide(inicio, agenda.duracao, ocupados);
}

export function descreverHorario(inicio: Date) {
  return `${DIAS_SEMANA[inicio.getDay()]}, ${pad(inicio.getDate())}/${pad(inicio.getMonth() + 1)} às ${pad(inicio.getHours())}:${pad(inicio.getMinutes())}`;
}

// Mensagem de confirmação com as variáveis preenchidas. Variável sem valor some junto com a linha
// em que estava sozinha (ex: "📍 {{empresa}}" sem empresa) pra não sobrar texto pela metade.
export function montarConfirmacao(modelo: string, v: { nome: string; data: string; empresa: string }) {
  const VARIAVEL = /{{\s*(nome|data|empresa)\s*}}/g;
  return modelo
    .split("\n")
    .map(linha => {
      const temVazia = [...linha.matchAll(VARIAVEL)].some(m => !v[m[1] as keyof typeof v].trim());
      const preenchida = linha.replace(VARIAVEL, (_, k: keyof typeof v) => v[k].trim());
      // Linha que era só emoji/pontuação + variável vazia → sai; "Oi, !" (nome vazio) → "Oi!"
      if (temVazia && !/[\p{L}\p{N}]/u.test(preenchida)) return null;
      return preenchida.replace(/\s*,\s*([!?.])/g, "$1");
    })
    .filter((l): l is string => l !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
