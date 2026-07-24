import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { Prisma } from "@/app/generated/prisma/client";

export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ conversations: [] });
  const { config, isManager } = result;

  const conversations = await prisma.conversation.findMany({
    where: {
      agentConfigId: config.id,
      // Gestor vê tudo; atendente só vê as dele + as ainda não atribuídas
      ...(isManager ? {} : { OR: [{ assignedToId: userId }, { assignedToId: null }] }),
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
