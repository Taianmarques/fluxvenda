import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { podeVerNaoAtribuidos } from "@/lib/crm-access";
import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ conversations: [] });
  const { config, isManager } = result;
  const verNaoAtribuidos = isManager || (await podeVerNaoAtribuidos(userId));

  const conversations = await prisma.conversation.findMany({
    where: {
      agentConfigId: config.id,
      // Gestor vê tudo. Atendente: conversa normal (não-grupo) — dele, ou (se o perfil de
      // acesso permitir) ainda não atribuída; grupo — lista de visibilidade vazia (padrão)
      // mostra pra todo mundo, senão só quem tá na lista (ver groupVisibleToIds).
      ...(isManager ? {} : {
        OR: [
          { isGroup: false, OR: [{ assignedToId: userId }, ...(verNaoAtribuidos ? [{ assignedToId: null }] : [])] },
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
  numero: z.string().trim().transform(v => v.replace(/\D/g, "")),
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
    // Mesma regra de sempre: atendente não abre uma conversa que já é de outro colega
    if (!isManager && existing.assignedToId && existing.assignedToId !== userId) {
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
