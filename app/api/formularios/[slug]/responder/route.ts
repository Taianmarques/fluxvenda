import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendTrialInviteToLead, gerarProximaPergunta } from "@/lib/lead-form-funnel";

type Question = { key: string; label: string; type: "TEXTO" | "WHATSAPP" | "EMAIL" | "NUMERO" };

const schema = z.object({
  submissionId: z.string().optional(),
  key: z.string().min(1),
  value: z.string().min(1).max(500),
});

// Pública — chamada uma vez por pergunta respondida (não espera o formulário inteiro terminar).
// Quando a pergunta respondida é do tipo WHATSAPP, dispara o convite pro teste grátis/demo na
// hora — é assim que "preencheu o whatsapp, já recebeu o disparo" funciona.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { submissionId, key, value } = body.data;

  const form = await prisma.leadForm.findUnique({ where: { slug } });
  if (!form || !form.active) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });

  const questions = form.questions as Question[];
  const question = questions.find(q => q.key === key);
  if (!question) return NextResponse.json({ error: "Pergunta inválida" }, { status: 400 });

  let submission = submissionId
    ? await prisma.leadFormSubmission.findUnique({ where: { id: submissionId } })
    : null;
  if (!submission || submission.formId !== form.id) {
    submission = await prisma.leadFormSubmission.create({ data: { formId: form.id, answers: {} } });
  }

  const answers = { ...(submission.answers as Record<string, string>), [key]: value };
  const extra: { nome?: string; whatsapp?: string } = {};
  if (key === "nome") extra.nome = value;
  if (question.type === "WHATSAPP") extra.whatsapp = value;

  submission = await prisma.leadFormSubmission.update({
    where: { id: submission.id },
    data: { answers, ...extra },
  });

  if (question.type === "WHATSAPP" && !submission.inviteSentAt) {
    const nome = submission.nome || answers.nome || "tudo bem";
    const sent = await sendTrialInviteToLead(nome, value).catch(() => false);
    if (sent) {
      await prisma.leadFormSubmission.update({ where: { id: submission.id }, data: { inviteSentAt: new Date() } });
    }
  }

  // A próxima pergunta é reescrita pela IA usando o que já foi respondido, pra soar como
  // continuação da conversa em vez do texto fixo cadastrado no admin.
  const currentIndex = questions.findIndex(q => q.key === key);
  const next = questions[currentIndex + 1];
  let nextMessage: string | null = null;
  if (next) {
    const respondidas = questions
      .slice(0, currentIndex + 1)
      .filter(q => answers[q.key] !== undefined)
      .map(q => ({ pergunta: q.label, resposta: answers[q.key] }));
    nextMessage = await gerarProximaPergunta({ headline: form.headline, respondidas, proximaPergunta: next.label });
  }

  return NextResponse.json({ submissionId: submission.id, nextMessage });
}
