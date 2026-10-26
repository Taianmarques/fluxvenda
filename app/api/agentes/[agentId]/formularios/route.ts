import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";
import { gerarQuizComIA } from "@/lib/lead-form-ai";
import { logTokenUsage, isOverQuota } from "@/lib/token-usage";
import { MODEL as CLAUDE_MODEL } from "@/lib/anthropic";

// Formulários de captação (link público /formulario/{slug}) criados pelo gestor no CRM pra um
// agente específico — mesma tabela (LeadForm) do super admin, mas com agentOwned = true e sempre
// roteados pro agente da URL. Ver app/api/admin/formularios pro equivalente da FluxVenda.

const MAX_FORMULARIOS_POR_AGENTE = 20;

const DEFAULT_QUESTIONS = [
  { key: "nome", label: "Então bora começar! Qual seu nome?", type: "TEXTO" as const },
  { key: "whatsapp", label: "E qual o seu WhatsApp com DDD?", type: "WHATSAPP" as const },
];

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  headline: z.string().trim().min(1).max(1000),
  style: z.enum(["CHAT", "TELAS"]).optional(),
});

function slugify(v: string): string {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const forms = await prisma.leadForm.findMany({
    where: { agentConfigId: config.id, agentOwned: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
  return NextResponse.json({ forms });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const raw = await req.json().catch(() => null);

  // Criar quiz com IA a partir de uma descrição em texto (o usuário só ajusta fotos/links depois)
  if (raw?.modo === "ia") {
    const descricao = typeof raw.descricao === "string" ? raw.descricao.trim() : "";
    if (descricao.length < 20) return NextResponse.json({ error: "Descreva o quiz com um pouco mais de detalhe (produto, público e objetivo)." }, { status: 400 });
    if (descricao.length > 3000) return NextResponse.json({ error: "Descrição longa demais (máx. 3000 caracteres)." }, { status: 400 });
    const total = await prisma.leadForm.count({ where: { agentConfigId: config.id, agentOwned: true } });
    if (total >= MAX_FORMULARIOS_POR_AGENTE) {
      return NextResponse.json({ error: `Limite de ${MAX_FORMULARIOS_POR_AGENTE} formulários por agente.` }, { status: 400 });
    }
    if (await isOverQuota(config.teamId)) {
      return NextResponse.json({ error: "Os créditos de IA da equipe acabaram — compre mais em Configurações > Créditos de IA." }, { status: 402 });
    }
    try {
      const { quiz, usage } = await gerarQuizComIA(descricao);
      logTokenUsage({ teamId: config.teamId, provider: "anthropic", model: CLAUDE_MODEL, feature: "quiz-ia", ...usage });
      const base = slugify(quiz.title) || "quiz";
      let slug = base;
      for (let i = 0; i < 5 && (await prisma.leadForm.findUnique({ where: { slug }, select: { id: true } })); i++) {
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }
      const form = await prisma.leadForm.create({
        data: { ...quiz, slug, agentConfigId: config.id, agentOwned: true },
      });
      return NextResponse.json({ form });
    } catch (err) {
      console.error("[formularios] quiz com IA", err);
      return NextResponse.json({ error: err instanceof Error ? err.message : "Não foi possível gerar o quiz agora." }, { status: 502 });
    }
  }

  const body = createSchema.safeParse(raw);
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const total = await prisma.leadForm.count({ where: { agentConfigId: config.id, agentOwned: true } });
  if (total >= MAX_FORMULARIOS_POR_AGENTE) {
    return NextResponse.json({ error: `Limite de ${MAX_FORMULARIOS_POR_AGENTE} formulários por agente.` }, { status: 400 });
  }

  // O link é global (/formulario/{slug}) — gera a partir do título e, se já existir, acrescenta
  // um sufixo aleatório. O gestor pode trocar depois no editor.
  const base = slugify(body.data.title) || "formulario";
  let slug = base;
  for (let i = 0; i < 5 && (await prisma.leadForm.findUnique({ where: { slug }, select: { id: true } })); i++) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const form = await prisma.leadForm.create({
    data: {
      slug, title: body.data.title, headline: body.data.headline, questions: DEFAULT_QUESTIONS,
      // Quiz em telas começa com as mesmas perguntas, uma por tela (o gestor monta o resto no editor)
      ...(body.data.style === "TELAS" && {
        style: "TELAS",
        steps: DEFAULT_QUESTIONS.map(q => ({ id: `s-${q.key}`, type: "pergunta", question: q })),
      }),
      agentConfigId: config.id, agentOwned: true,
    },
  });
  return NextResponse.json({ form });
}
