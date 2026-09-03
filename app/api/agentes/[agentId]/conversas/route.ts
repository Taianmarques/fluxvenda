import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole, negadaParaAtendente } from "@/lib/team";
import { emitChatEvent } from "@/lib/realtime";
import { Prisma } from "@/app/generated/prisma/client";
import { normalizePhoneBR } from "@/lib/phone";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ conversations: [] });
  const { config, isManager } = result;

  // Contato novo sem atendente: se o agente tem um atendente padrão pro online configurado
  // (iaLeadAttendantId), só ele enxerga a fila de leads sem dono — os outros só veem o que já é
  // deles. Sem atendente padrão configurado, mantém o comportamento antigo (fila visível a todos).
  const unassignedVisible = isManager || !config.iaLeadAttendantId || config.iaLeadAttendantId === userId;

  const conversations = await prisma.conversation.findMany({
    where: {
      agentConfigId: config.id,
      // Contato importado/cadastrado manualmente vira uma conversa sem mensagens — não deve
      // aparecer na caixa de entrada como se fosse um atendimento em aberto (ver page.tsx)
      messages: { some: {} },
      isSandbox: false, // conversa de teste do simulador nunca aparece na caixa real
      // Gestor vê tudo. Atendente: conversa normal (não-grupo) — dele, ou (se for o atendente
      // padrão do online, ou não houver um configurado) ainda não atribuída em aberto; conversa
      // encerrada sem dono não fica visível pra equipe inteira pra sempre, só pro gestor. Grupo —
      // lista de visibilidade vazia (padrão) mostra pra todo mundo, senão só quem tá na lista
      // (ver groupVisibleToIds, configurado pelo cabeçalho do chat do grupo).
      ...(isManager ? {} : {
        OR: [
          {
            isGroup: false,
            OR: [
              { assignedToId: userId },
              ...(unassignedVisible ? [{ assignedToId: null, status: { not: "FINALIZADO" as const } }] : []),
            ],
          },
          { isGroup: true, OR: [{ groupVisibleToIds: { isEmpty: true } }, { groupVisibleToIds: { has: userId } }] },
        ],
      }),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { where: { role: { not: "note" } }, orderBy: { createdAt: "desc" }, take: 1 },
      opportunities: { orderBy: { createdAt: "asc" } },
      etiquetas: { select: { id: true, nome: true, cor: true } },
    },
  });

  // Contador exato de mensagens do cliente ainda não lidas — uma query só (evita N+1),
  // já que cada conversa tem seu próprio "lastReadAt" de corte.
  const ids = conversations.map(c => c.id);
  const unreadRows = ids.length > 0 ? await prisma.$queryRaw<{ conversationId: string; count: bigint }[]>(Prisma.sql`
    SELECT m."conversationId" as "conversationId", COUNT(*) as count
    FROM "Message" m
    JOIN "Conversation" c ON c.id = m."conversationId"
    WHERE m."conversationId" IN (${Prisma.join(ids)})
      AND m.role = 'user'
      AND (c."lastReadAt" IS NULL OR m."createdAt" > c."lastReadAt")
    GROUP BY m."conversationId"
  `) : [];
  const unreadMap = new Map(unreadRows.map(r => [r.conversationId, Number(r.count)]));

  // Mesma lógica do WhatsApp: sobe pro topo pela hora da ÚLTIMA MENSAGEM, não pelo
  // updatedAt — que é tocado por qualquer mudança (marcar como lida, trocar status,
  // atribuir atendente...) e jogava conversa pro topo sem mensagem nova. Fixadas vêm
  // sempre primeiro, mantendo a mesma ordenação por tempo dentro de cada grupo.
  conversations.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const ta = a.messages[0]?.createdAt.getTime() ?? a.updatedAt.getTime();
    const tb = b.messages[0]?.createdAt.getTime() ?? b.updatedAt.getTime();
    return tb - ta;
  });

  return NextResponse.json({
    conversations: conversations.map(c => ({ ...c, unreadCount: unreadMap.get(c.id) ?? 0 })),
  });
}

const createSchema = z.object({
  numero: z.string().trim().transform(v => normalizePhoneBR(v)),
  nome: z.string().trim().max(80).optional(),
});

// Abre (ou reabre) um atendimento com um número específico — usado pelo botão "Novo
// atendimento" do chat, pra qualquer atendente conseguir puxar uma conversa proativamente com
// um contato já dele, sem precisar esperar mensagem chegando primeiro.
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config, isManager } = result;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { numero, nome } = body.data;
  if (numero.length < 10 || numero.length > 13) {
    return NextResponse.json({ error: "Número inválido — use DDD + número" }, { status: 400 });
  }

  const existing = await prisma.conversation.findUnique({
    where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber: numero } },
  });

  if (existing) {
    // Mesma regra de sempre: atendente não abre uma conversa que já é de outro colega, nem uma
    // sem dono que só o atendente padrão do online pode ver (ver negadaParaAtendente)
    if (!isManager && negadaParaAtendente(existing, userId, config.iaLeadAttendantId)) {
      return NextResponse.json({ error: "Esse contato já está com outro atendente" }, { status: 409 });
    }
    const conversation = existing.assignedToId
      ? existing
      : await prisma.conversation.update({ where: { id: existing.id }, data: { assignedToId: userId } });
    return NextResponse.json({ conversation });
  }

  const conversation = await prisma.conversation.create({
    data: { agentConfigId: config.id, contactNumber: numero, contactName: nome?.trim() || null, assignedToId: userId },
  });
  return NextResponse.json({ conversation });
}

const bulkSchema = z.object({
  conversationIds: z.array(z.string()).min(1).max(200),
  acao: z.enum(["mover_etapa", "aceitar", "encerrar"]),
  stageId: z.string().optional(),           // mover_etapa
  motivo: z.string().max(200).optional(),   // encerrar
});

// Seleção múltipla no chat (Ativos/Pendentes/Finalizados) — três ações em lote de uma vez só:
// mover pra etapa do pipeline, aceitar atendimento, ou encerrar. Mesma regra de acesso de
// sempre (negadaParaAtendente) — atendente só mexe no que já é dele ou ainda não tem dono.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config, isManager } = result;

  const body = bulkSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  let stage: { id: string } | null = null;
  if (body.data.acao === "mover_etapa") {
    if (!body.data.stageId) return NextResponse.json({ error: "Etapa é obrigatória" }, { status: 400 });
    stage = await prisma.pipelineStage.findFirst({ where: { id: body.data.stageId, pipeline: { agentConfigId: config.id } } });
    if (!stage) return NextResponse.json({ error: "Etapa não encontrada" }, { status: 404 });
  }

  // Só conversas desse agente que o usuário realmente pode mexer — ids de fora, de outro
  // atendente, ou de grupo sem visibilidade pra ele são ignorados silenciosamente.
  const conversas = await prisma.conversation.findMany({
    where: { id: { in: body.data.conversationIds }, agentConfigId: config.id },
    include: { opportunities: { where: { wonAt: null }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const permitidas = isManager ? conversas : conversas.filter(c => !negadaParaAtendente(c, userId, config.iaLeadAttendantId));

  for (const conv of permitidas) {
    if (body.data.acao === "mover_etapa" && stage) {
      const opp = conv.opportunities[0];
      if (opp) {
        if (opp.stageId !== stage.id) {
          await prisma.opportunity.update({ where: { id: opp.id }, data: { stageId: stage.id, stageEnteredAt: new Date() } });
        }
      } else {
        await prisma.opportunity.create({ data: { conversationId: conv.id, stageId: stage.id, stageEnteredAt: new Date(), dealValue: 0 } });
      }
    } else if (body.data.acao === "aceitar") {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { humanTakeover: true, status: "ATIVO", assignedToId: userId },
      });
    } else if (body.data.acao === "encerrar") {
      // Encerrar uma conversa sem dono reivindica ela pra quem encerrou — mesma regra do
      // encerramento individual (ver assumirAoEncerrar em conversas/[id]/route.ts)
      const assumirAoEncerrar = !conv.assignedToId;
      await prisma.conversation.update({
        where: { id: conv.id },
        data: {
          status: "FINALIZADO",
          ...(assumirAoEncerrar && { assignedToId: userId }),
          motivoEncerramento: body.data.motivo ?? null,
          encerradaEm: new Date(),
        },
      });
      if (body.data.motivo) {
        await prisma.message.create({
          data: { conversationId: conv.id, role: "note", content: `Atendimento encerrado — motivo: ${body.data.motivo}.` },
        });
      }
    }
    emitChatEvent(config.id, conv.id);
  }

  return NextResponse.json({ ok: true, afetados: permitidas.length });
}
