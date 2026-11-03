import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { AGENDA_JANELA_DIAS, descreverHorario, horarioDisponivel, horariosLivres, montarConfirmacao, normalizarAgenda } from "@/lib/lead-form-agenda";

// Agendamento ao final do formulário/quiz (público). GET lista os horários livres; POST marca a
// reunião pra resposta (submission) que já tem WhatsApp — uma por resposta. A reunião vira um
// Appointment na agenda do agente do formulário, então horário ocupado por qualquer outro
// agendamento desse agente some da lista.

async function carregar(slug: string) {
  const form = await prisma.leadForm.findUnique({
    where: { slug },
    select: { id: true, title: true, active: true, bookingEnabled: true, bookingConfig: true, agentConfigId: true, agentConfig: { select: { uazapiToken: true, team: { select: { name: true } } } } },
  });
  if (!form?.active || !form.bookingEnabled || !form.agentConfigId) return null;
  return { form, agentConfigId: form.agentConfigId, agenda: normalizarAgenda(form.bookingConfig) };
}

function ocupados(agentConfigId: string) {
  const agora = new Date();
  return prisma.appointment.findMany({
    where: {
      agentConfigId, status: "CONFIRMADO",
      scheduledAt: { gte: new Date(agora.getTime() - 24 * 3600000), lte: new Date(agora.getTime() + (AGENDA_JANELA_DIAS + 2) * 86400000) },
    },
    select: { scheduledAt: true, durationMinutes: true },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await carregar(slug);
  if (!dados) return NextResponse.json({ error: "Agenda indisponível" }, { status: 404 });
  return NextResponse.json({ dias: horariosLivres(dados.agenda, await ocupados(dados.agentConfigId)) });
}

// date/time separados — o servidor monta o Date no horário de Brasília (instrumentation.ts),
// mesmo padrão da agenda de demonstração e da página /agendar
const schema = z.object({
  submissionId: z.string().min(1).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const dados = await carregar(slug);
  if (!dados) return NextResponse.json({ error: "Agenda indisponível" }, { status: 404 });
  const { form, agentConfigId, agenda } = dados;

  const submission = await prisma.leadFormSubmission.findUnique({
    where: { id: body.data.submissionId },
    select: { id: true, formId: true, nome: true, whatsapp: true, appointmentId: true },
  });
  if (!submission || submission.formId !== form.id || !submission.whatsapp) {
    return NextResponse.json({ error: "Responda o formulário antes de agendar." }, { status: 400 });
  }
  if (submission.appointmentId) return NextResponse.json({ error: "Você já tem um horário agendado." }, { status: 409 });

  const inicio = new Date(`${body.data.date}T${body.data.time}:00`);
  if (!horarioDisponivel(agenda, await ocupados(agentConfigId), inicio)) {
    return NextResponse.json({ error: "Esse horário acabou de ser ocupado. Escolha outro." }, { status: 409 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      agentConfigId, contactName: submission.nome, contactNumber: submission.whatsapp,
      scheduledAt: inicio, durationMinutes: agenda.duracao,
      notes: `Agendado pelo formulário "${form.title}"${agenda.subtitulo ? ` — ${agenda.subtitulo}` : ""}`,
    },
  });
  // Uma reunião por resposta: se outra requisição marcou ao mesmo tempo, desfaz esta
  const marcou = await prisma.leadFormSubmission.updateMany({ where: { id: submission.id, appointmentId: null }, data: { appointmentId: appointment.id } });
  if (marcou.count === 0) {
    await prisma.appointment.delete({ where: { id: appointment.id } }).catch(() => {});
    return NextResponse.json({ error: "Você já tem um horário agendado." }, { status: 409 });
  }

  const quando = descreverHorario(inicio);
  const token = form.agentConfig?.uazapiToken;
  if (token) {
    // Mensagem do formulário (configurável no editor) com nome, data e empresa preenchidos
    const texto = montarConfirmacao(agenda.mensagem, {
      nome: (submission.nome ?? "").trim().split(/\s+/)[0] ?? "",
      data: quando,
      empresa: form.agentConfig?.team?.name ?? "",
    });
    sendWhatsAppTextAsTeam(token, submission.whatsapp, texto).catch(err => console.error("[formulario/agenda] confirmação no WhatsApp", form.id, err));
  }
  return NextResponse.json({ ok: true, quando });
}
