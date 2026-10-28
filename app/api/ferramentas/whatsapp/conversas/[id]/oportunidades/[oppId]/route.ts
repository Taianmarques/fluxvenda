import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

async function loadOpportunity(id: string, oppId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return null;
  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return null;
  if (!result.isManager && conversation.assignedToId && conversation.assignedToId !== userId) return null;
  const opportunity = await prisma.opportunity.findFirst({ where: { id: oppId, conversationId: id } });
  if (!opportunity) return null;
  return { opportunity, config: result.config };
}

// Etapa que representa negócio fechado (o botão "Ganho" também move pra "Fechado")
function isEtapaGanho(nome: string) {
  const n = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  return /^(fechado|fechada|ganho|ganha|vendido|venda fechada|negocio fechado|negocio ganho)$/.test(n);
}

const patchSchema = z.object({
  title: z.string().max(60).nullable().optional(),
  dealValue: z.number().positive().optional(),
  stageId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, oppId } = await params;
  const loaded = await loadOpportunity(id, oppId, userId);
  if (!loaded) return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 });
  const { opportunity, config } = loaded;

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  let destino: { name: string } | null = null;
  if (body.data.stageId) {
    destino = await prisma.pipelineStage.findFirst({ where: { id: body.data.stageId, pipeline: { agentConfigId: config.id } } });
    if (!destino) return NextResponse.json({ error: "Etapa não encontrada" }, { status: 404 });
  }

  const stageChanged = body.data.stageId !== undefined && body.data.stageId !== opportunity.stageId;

  // Arrastar pra etapa de fechamento conta como ganho (é o que o "Ganho no mês" do pipeline soma);
  // tirar de lá reabre o negócio. Perdidas não mudam.
  let ganho: { wonAt: Date | null } | null = null;
  if (stageChanged && !opportunity.lostAt) {
    const origem = opportunity.stageId
      ? await prisma.pipelineStage.findUnique({ where: { id: opportunity.stageId }, select: { name: true } })
      : null;
    if (destino && isEtapaGanho(destino.name) && !opportunity.wonAt) ganho = { wonAt: new Date() };
    else if (opportunity.wonAt && origem && isEtapaGanho(origem.name) && !(destino && isEtapaGanho(destino.name))) ganho = { wonAt: null };
  }

  const updated = await prisma.opportunity.update({
    where: { id: oppId },
    data: {
      ...(body.data.title !== undefined && { title: body.data.title }),
      ...(body.data.dealValue !== undefined && { dealValue: body.data.dealValue }),
      ...(body.data.stageId !== undefined && { stageId: body.data.stageId }),
      ...(stageChanged && { stageEnteredAt: new Date(), stageFollowupCount: 0, lastStageFollowupAt: null }),
      ...ganho,
    },
  });

  return NextResponse.json({ opportunity: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, oppId } = await params;
  const loaded = await loadOpportunity(id, oppId, userId);
  if (!loaded) return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 });

  await prisma.opportunity.delete({ where: { id: oppId } });
  return NextResponse.json({ ok: true });
}
