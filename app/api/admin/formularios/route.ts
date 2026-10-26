import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { questionsSchema } from "@/lib/lead-form-schema";
import { quizExemploTemplate } from "@/lib/lead-form-templates";
import { gerarQuizComIA } from "@/lib/lead-form-ai";
import { logTokenUsage } from "@/lib/token-usage";
import { FLUXVENDA_TEAM_ID } from "@/lib/internal-agent";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const createSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen"),
  title: z.string().min(1).max(120),
  headline: z.string().min(1).max(1000),
  questions: questionsSchema,
  pixelId: z.string().max(40).optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const forms = await prisma.leadForm.findMany({
    where: { agentOwned: false },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
  return NextResponse.json({ forms });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);

  // Modelo pronto (quiz em telas de exemplo) — cria com link livre e já ativo pra abrir e testar
  if (raw?.template === "quiz-exemplo") {
    const t = quizExemploTemplate();
    let slug = "quiz-exemplo";
    for (let i = 0; i < 5 && (await prisma.leadForm.findUnique({ where: { slug }, select: { id: true } })); i++) {
      slug = `quiz-exemplo-${Math.random().toString(36).slice(2, 6)}`;
    }
    const form = await prisma.leadForm.create({ data: { ...t, slug } });
    return NextResponse.json({ form });
  }

  // Quiz gerado com IA a partir de uma descrição em texto
  if (raw?.template === "ia") {
    const descricao = typeof raw.descricao === "string" ? raw.descricao.trim() : "";
    if (descricao.length < 20) return NextResponse.json({ error: "Cole o roteiro do quiz (perguntas, opções e resultados) ou anexe o arquivo." }, { status: 400 });
    if (descricao.length > 20000) return NextResponse.json({ error: "Material longo demais (máx. 20 mil caracteres)." }, { status: 400 });
    try {
      const { quiz, usage, provider, model } = await gerarQuizComIA(descricao);
      logTokenUsage({ teamId: FLUXVENDA_TEAM_ID, provider, model, feature: "quiz-ia", ...usage });
      const base = quiz.title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "quiz";
      let slug = base;
      for (let i = 0; i < 5 && (await prisma.leadForm.findUnique({ where: { slug }, select: { id: true } })); i++) {
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }
      const form = await prisma.leadForm.create({ data: { ...quiz, slug } });
      return NextResponse.json({ form });
    } catch (err) {
      console.error("[admin/formularios] quiz com IA", err);
      return NextResponse.json({ error: err instanceof Error ? err.message : "Não foi possível gerar o quiz agora." }, { status: 502 });
    }
  }

  const body = createSchema.safeParse(raw);
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const existing = await prisma.leadForm.findUnique({ where: { slug: body.data.slug } });
  if (existing) return NextResponse.json({ error: "Já existe um formulário com esse link" }, { status: 400 });

  const form = await prisma.leadForm.create({ data: body.data });
  return NextResponse.json({ form });
}
