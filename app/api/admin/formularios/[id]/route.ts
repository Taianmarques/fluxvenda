import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { questionsSchema, extrasShape, quizResultsSchema, stepsSchema, styleSchema } from "@/lib/lead-form-schema";
import { quizOrderError, stepsToQuestions, type QuizResult, type QuizStep } from "@/lib/lead-form-shared";
import { Prisma } from "@/app/generated/prisma/client";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const updateSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen").optional(),
  title: z.string().min(1).max(120).optional(),
  headline: z.string().min(1).max(1000).optional(),
  questions: questionsSchema.optional(),
  style: styleSchema.optional(),
  checkoutSandbox: z.boolean().optional(),
  steps: stepsSchema.optional(),
  ...extrasShape,
  quizResults: quizResultsSchema,
  pixelId: z.string().max(40).nullable().optional(),
  avatarUrl: z.string().max(8_000_000).nullable().optional(),
  active: z.boolean().optional(),
  // null = agente interno multi-setor da FluxVenda (padrão antigo)
  agentConfigId: z.string().nullable().optional(),
  inviteMessage: z.string().max(1000).nullable().optional(),
  doneMessage: z.string().max(1000).nullable().optional(),
  funnelSteps: z.array(z.object({
    minutos: z.number().int().min(1).max(43200),
    mensagem: z.string().trim().min(1).max(1000),
  })).max(15).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const form = await prisma.leadForm.findUnique({
    where: { id },
    include: { submissions: { orderBy: { createdAt: "desc" }, take: 200 } },
  });
  if (!form) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
  return NextResponse.json({ form });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  // Quiz em telas: as perguntas vêm das etapas
  if (body.data.steps) {
    const derived = questionsSchema.safeParse(stepsToQuestions(body.data.steps as QuizStep[]));
    if (!derived.success) return NextResponse.json({ error: derived.error.issues[0]?.message ?? "Perguntas inválidas" }, { status: 400 });
    body.data.questions = derived.data;
  }

  if (body.data.slug) {
    const clash = await prisma.leadForm.findFirst({ where: { slug: body.data.slug, NOT: { id } } });
    if (clash) return NextResponse.json({ error: "Já existe um formulário com esse link" }, { status: 400 });
  }

  if (body.data.agentConfigId) {
    const agent = await prisma.agentConfig.findUnique({ where: { id: body.data.agentConfigId }, select: { id: true } });
    if (!agent) return NextResponse.json({ error: "Agente de destino inválido" }, { status: 400 });
  }

  const { quizResults, ...rest } = body.data;
  if (quizResults !== undefined) {
    const questions = body.data.questions
      ?? ((await prisma.leadForm.findUnique({ where: { id }, select: { questions: true } }))?.questions as never) ?? [];
    // Etiqueta/etapa por resultado é coisa do CRM — no super admin o resultado não leva nenhuma
    const results = ((quizResults ?? []) as QuizResult[]).map(r => ({ ...r, etiquetaId: null, pipelineStageId: null }));
    const orderError = quizOrderError(questions, results);
    if (orderError) return NextResponse.json({ error: orderError }, { status: 400 });
    const form = await prisma.leadForm.update({
      where: { id },
      data: { ...rest, quizResults: results.length ? results : Prisma.DbNull },
    });
    return NextResponse.json({ form });
  }

  const form = await prisma.leadForm.update({ where: { id }, data: rest });
  return NextResponse.json({ form });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.leadForm.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
