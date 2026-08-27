import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

const schema = z.object({
  conversationIds: z.array(z.string()).min(1).max(500),
  acao: z.enum(["aceitar", "mover_etapa", "encerrar"]),
  stageId: z.string().optional(),   // mover_etapa
  motivo: z.string().trim().min(1).max(150).optional(), // encerrar
});

// Ações em lote nas conversas selecionadas nas abas Ativos/Pendentes do inbox — aceitar
// atendimento, mover pra uma etapa do pipeline, ou encerrar com motivo. Cada conversa é
// processada de forma independente (uma falha/pulo não derruba as outras).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config, isManager } = result;

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const d = body.data;

  // Só conversas desse agente — ids de outro tenant são descartados silenciosamente
  const conversas = await prisma.conversation.findMany({
    where: { id: { in: d.conversationIds }, agentConfigId: config.id },
    select: { id: true, assignedToId: true },
  });
  if (conversas.length === 0) return NextResponse.json({ error: "Nenhuma conversa válida" }, { status: 400 });

  let aplicadas = 0;
  let puladas = 0;

  if (d.acao === "aceitar") {
    for (const c of conversas) {
      // Mesma regra de app/api/ferramentas/whatsapp/conversas/[id]/aceitar/route.ts — atendente
      // comum não rouba conversa já atribuída a outra pessoa; gestor sempre pode.
      if (!isManager && c.assignedToId && c.assignedToId !== userId) { puladas++; continue; }
      await prisma.conversation.update({
        where: { id: c.id },
        data: { humanTakeover: true, status: "ATIVO", assignedToId: userId },
      });
      aplicadas++;
    }
    return NextResponse.json({ aplicadas, puladas });
  }

  if (d.acao === "encerrar") {
    if (!d.motivo) return NextResponse.json({ error: "Motivo obrigatório" }, { status: 400 });
    await prisma.conversation.updateMany({
      where: { id: { in: conversas.map(c => c.id) } },
      data: { status: "FINALIZADO", motivoEncerramento: d.motivo },
    });
    return NextResponse.json({ aplicadas: conversas.length, puladas: 0 });
  }

  // mover_etapa
  if (!d.stageId) return NextResponse.json({ error: "Etapa obrigatória" }, { status: 400 });
  const stage = await prisma.pipelineStage.findFirst({ where: { id: d.stageId, pipeline: { agentConfigId: config.id } } });
  if (!stage) return NextResponse.json({ error: "Etapa não encontrada" }, { status: 404 });

  for (const c of conversas) {
    const abertas = await prisma.opportunity.findMany({
      where: { conversationId: c.id, wonAt: null, lostAt: null },
      select: { id: true },
    });
    if (abertas.length > 1) { puladas++; continue; }
    if (abertas.length === 0) {
      await prisma.opportunity.create({ data: { conversationId: c.id, dealValue: 0, title: null, stageId: d.stageId } });
    } else {
      await prisma.opportunity.update({
        where: { id: abertas[0].id },
        data: { stageId: d.stageId, stageEnteredAt: new Date(), stageFollowupCount: 0, lastStageFollowupAt: null },
      });
    }
    aplicadas++;
  }
  return NextResponse.json({ aplicadas, puladas });
}
