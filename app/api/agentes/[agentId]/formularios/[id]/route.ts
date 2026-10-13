import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { questionsSchema, extrasShape } from "@/lib/lead-form-schema";
import { z } from "zod";

const updateSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen").optional(),
  title: z.string().trim().min(1).max(120).optional(),
  headline: z.string().trim().min(1).max(1000).optional(),
  questions: questionsSchema
    .refine(qs => qs.filter(q => q.type === "WHATSAPP").length === 1, "O formulário precisa de exatamente uma pergunta do tipo WhatsApp (é ela que dispara a primeira mensagem)")
    .optional(),
  ...extrasShape,
  pixelId: z.string().max(40).nullable().optional(),
  avatarUrl: z.string().max(8_000_000).nullable().optional(),
  active: z.boolean().optional(),
  inviteMessage: z.string().max(1000).nullable().optional(),
  doneMessage: z.string().max(1000).nullable().optional(),
  etiquetaId: z.string().nullable().optional(),
  pipelineStageId: z.string().nullable().optional(),
  funnelSteps: z.array(z.object({
    minutos: z.number().int().min(1).max(43200),
    mensagem: z.string().trim().min(1).max(1000),
  })).max(15).optional(),
});

// Carrega o formulário só se for do agente da URL E criado pelo CRM — formulários do super admin
// (agentOwned = false) nunca são editáveis daqui, mesmo apontando pro mesmo agente.
async function loadOwnedForm(userId: string, agentId: string, id: string) {
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return null;
  const form = await prisma.leadForm.findFirst({ where: { id, agentConfigId: config.id, agentOwned: true } });
  return form ? { config, form } : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string; id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, id } = await params;
  const owned = await loadOwnedForm(userId, agentId, id);
  if (!owned) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });

  const body = updateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  if (body.data.slug) {
    const clash = await prisma.leadForm.findFirst({ where: { slug: body.data.slug, NOT: { id } }, select: { id: true } });
    if (clash) return NextResponse.json({ error: "Já existe um formulário com esse link — escolha outro" }, { status: 400 });
  }

  // Etiqueta e etapa precisam ser DESTE agente — nunca grava um id de outro cliente
  if (body.data.etiquetaId) {
    const etiqueta = await prisma.etiqueta.findFirst({ where: { id: body.data.etiquetaId, agentConfigId: owned.config.id }, select: { id: true } });
    if (!etiqueta) return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 400 });
  }
  if (body.data.pipelineStageId) {
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: body.data.pipelineStageId, pipeline: { agentConfigId: owned.config.id } }, select: { id: true },
    });
    if (!stage) return NextResponse.json({ error: "Etapa do pipeline não encontrada" }, { status: 400 });
  }

  const form = await prisma.leadForm.update({ where: { id }, data: body.data });
  return NextResponse.json({ form });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ agentId: string; id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, id } = await params;
  const owned = await loadOwnedForm(userId, agentId, id);
  if (!owned) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });

  await prisma.leadForm.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
