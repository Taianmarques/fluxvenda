import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendFormInviteToLead, sendQuizResultToLead, gerarProximaPergunta } from "@/lib/lead-form-funnel";
import { isPlausibleBrPhone, normalizeQuizResults, computeQuizResult, isQuizScoring, type LeadFormQuestion, type LeadFormUtm } from "@/lib/lead-form-shared";

const utmField = z.string().trim().max(120).optional();

const schema = z.object({
  submissionId: z.string().optional(),
  key: z.string().min(1),
  value: z.string().min(1).max(500),
  consent: z.boolean().optional(),
  utm: z.object({ source: utmField, medium: utmField, campaign: utmField, content: utmField, referrer: utmField }).optional(),
});

// Pública — chamada uma vez por pergunta respondida (não espera o formulário inteiro terminar).
// Quando a pergunta respondida é do tipo WHATSAPP, dispara o convite na hora — é assim que
// "preencheu o whatsapp, já recebeu o disparo" funciona. Valida a resposta no servidor (o cliente
// só mostra o erro e repete a pergunta) e devolve se o convite saiu, pra tela final mostrar o
// plano B (botão de WhatsApp) quando não saiu.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { submissionId, key, value, consent, utm } = body.data;

  const form = await prisma.leadForm.findUnique({ where: { slug } });
  if (!form || !form.active) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });

  const questions = form.questions as LeadFormQuestion[];
  const question = questions.find(q => q.key === key);
  if (!question) return NextResponse.json({ error: "Pergunta inválida" }, { status: 400 });

  if (question.type === "WHATSAPP" && !isPlausibleBrPhone(value)) {
    return NextResponse.json({ error: "Esse número parece incompleto. Confere se colocou o DDD e todos os dígitos?" }, { status: 400 });
  }
  if (question.type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return NextResponse.json({ error: "Esse e-mail parece inválido. Pode conferir?" }, { status: 400 });
  }
  if (question.type === "ESCOLHA" && !(question.options ?? []).includes(value)) {
    return NextResponse.json({ error: "Escolha uma das opções." }, { status: 400 });
  }
  if (question.type === "WHATSAPP" && form.consentText?.trim() && !consent) {
    return NextResponse.json({ error: "Marque a caixinha de consentimento pra continuar." }, { status: 400 });
  }

  const utmClean: LeadFormUtm | undefined = utm && Object.values(utm).some(Boolean)
    ? Object.fromEntries(Object.entries(utm).filter(([, v]) => v)) as LeadFormUtm
    : undefined;

  let submission = submissionId
    ? await prisma.leadFormSubmission.findUnique({ where: { id: submissionId } })
    : null;
  if (!submission || submission.formId !== form.id) {
    submission = await prisma.leadFormSubmission.create({ data: { formId: form.id, answers: {}, ...(utmClean && { utm: utmClean }) } });
  }

  const answers = { ...(submission.answers as Record<string, string>), [key]: value };
  const extra: { nome?: string; whatsapp?: string; consentAt?: Date } = {};
  if (key === "nome") extra.nome = value;
  if (question.type === "WHATSAPP") {
    extra.whatsapp = value;
    if (form.consentText?.trim() && consent) extra.consentAt = new Date();
  }

  submission = await prisma.leadFormSubmission.update({
    where: { id: submission.id },
    data: { answers, ...extra },
  });

  // Quiz: o resultado fecha quando não sobra pergunta que pontua. Se o WhatsApp veio ANTES do quiz
  // (pra garantir o contato logo no início), a 1ª mensagem sai na hora sem resultado e, ao
  // terminar, o resultado vai numa 2ª mensagem. Se veio DEPOIS, a 1ª mensagem já sai com ele.
  const quizResults = normalizeQuizResults(form.quizResults);
  const currentIndex = questions.findIndex(q => q.key === key);
  const isLast = currentIndex === questions.length - 1;
  const quizFechado = isLast || !questions.slice(currentIndex + 1).some(isQuizScoring);
  const prevQuizResult = submission.quizResult;
  const quiz = quizResults.length > 0 && quizFechado && (question.type === "WHATSAPP" || isLast || isQuizScoring(question))
    ? computeQuizResult(questions, quizResults, answers)
    : null;
  if (quiz && prevQuizResult !== quiz.key) {
    submission = await prisma.leadFormSubmission.update({ where: { id: submission.id }, data: { quizResult: quiz.key } });
  }
  // WhatsApp já respondido antes e a mensagem de abertura já saiu: o resultado vai como mensagem
  // seguinte (uma vez só — reenvio do mesmo passo não repete)
  if (quiz && question.type !== "WHATSAPP" && !prevQuizResult && submission.inviteSentAt && submission.whatsapp) {
    await sendQuizResultToLead({
      whatsappRaw: submission.whatsapp, agentConfigId: form.agentConfigId,
      nome: submission.nome || answers.nome || "tudo bem",
      mensagem: quiz.mensagem, resultado: quiz.titulo, ctaUrl: form.ctaUrl,
      etiquetaId: quiz.etiquetaId, pipelineStageId: quiz.pipelineStageId,
    }).catch(err => console.error("[formularios] falha ao enviar resultado do quiz:", err));
  }

  let inviteSent: boolean | undefined;
  if (question.type === "WHATSAPP") {
    if (submission.inviteSentAt) {
      inviteSent = true; // já saiu antes (lead voltou e reenviou o mesmo passo)
    } else {
      const nome = submission.nome || answers.nome || "tudo bem";
      const result = await sendFormInviteToLead({
        nome, whatsappRaw: value, agentConfigId: form.agentConfigId,
        inviteMessage: quiz?.mensagem.trim() || form.inviteMessage,
        agentOwned: form.agentOwned, ctaUrl: form.ctaUrl,
        etiquetaId: quiz?.etiquetaId || form.etiquetaId,
        pipelineStageId: quiz?.pipelineStageId || form.pipelineStageId, formTitle: form.title,
        quizResultado: quiz?.titulo ?? null,
        utm: (submission.utm as LeadFormUtm | null) ?? null,
      }).catch((err): { ok: false; error: string } => {
        console.error("[formularios] falha ao enviar convite:", err);
        return { ok: false, error: "Erro inesperado ao enviar a mensagem." };
      });
      inviteSent = result.ok;
      await prisma.leadFormSubmission.update({
        where: { id: submission.id },
        data: result.ok ? { inviteSentAt: new Date(), inviteError: null } : { inviteError: result.error },
      });
    }
  }

  // A próxima pergunta é reescrita pela IA usando o que já foi respondido, pra soar como
  // continuação da conversa em vez do texto fixo cadastrado no admin. Pergunta de escolha mantém
  // o texto original (as opções dependem exatamente do que foi escrito).
  const next = questions[currentIndex + 1];
  let nextMessage: string | null = null;
  // No quiz em telas a pergunta aparece sozinha na tela, sem conversa — não faz sentido reescrever
  if (next && next.type !== "ESCOLHA" && form.style !== "TELAS") {
    const respondidas = questions
      .slice(0, currentIndex + 1)
      .filter(q => answers[q.key] !== undefined)
      .map(q => ({ pergunta: q.label, resposta: answers[q.key] }));
    nextMessage = await gerarProximaPergunta({ headline: form.headline, respondidas, proximaPergunta: next.label });
  }

  return NextResponse.json({
    submissionId: submission.id, nextMessage, inviteSent,
    ...(quiz && {
      quiz: {
        titulo: quiz.titulo, descricao: quiz.descricao, conversionUrl: quiz.conversionUrl || null,
        nivel: quiz.nivel, imageUrl: quiz.imageUrl ?? null,
      },
    }),
  });
}
