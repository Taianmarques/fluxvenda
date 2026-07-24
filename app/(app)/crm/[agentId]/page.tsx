import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { WhatsappInbox } from "../WhatsappInbox";

export default function WhatsappInboxPage(props: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  return (
    <CrmPageGate pageKey="mensagens">
      <WhatsappInboxPageContent {...props} />
    </CrmPageGate>
  );
}

async function WhatsappInboxPageContent({
  params, searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;
  const isManager = result?.isManager ?? false;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <MessageCircle size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento para ver as conversas aqui.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  const { c } = await searchParams;

  const [conversations, leadStatuses] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        agentConfigId: config.id,
        ...(isManager ? {} : { OR: [{ assignedToId: user.id }, { assignedToId: null }] }),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: { where: { role: { not: "note" } }, orderBy: { createdAt: "desc" }, take: 1 },
        opportunities: { orderBy: { createdAt: "asc" } },
        etiquetas: { select: { id: true, nome: true, cor: true } },
      },
    }),
    prisma.leadStatus.findMany({ where: { agentConfigId: config.id }, orderBy: { order: "asc" } }),
  ]);

  // Mesma query do polling (ver app/api/agentes/[agentId]/conversas/route.ts) — contador
  // exato de mensagens do cliente ainda não lidas, numa query só.
  const convIds = conversations.map(c => c.id);
  const unreadRows = convIds.length > 0 ? await prisma.$queryRaw<{ conversationId: string; count: bigint }[]>(Prisma.sql`
    SELECT m."conversationId" as "conversationId", COUNT(*) as count
    FROM "Message" m
    JOIN "Conversation" c ON c.id = m."conversationId"
    WHERE m."conversationId" IN (${Prisma.join(convIds)})
      AND m.role = 'user'
      AND (c."lastReadAt" IS NULL OR m."createdAt" > c."lastReadAt")
    GROUP BY m."conversationId"
  `) : [];
  const unreadMap = new Map(unreadRows.map(r => [r.conversationId, Number(r.count)]));

  // Mesma lógica do WhatsApp: ordena pela hora da última mensagem (ver
  // app/api/agentes/[agentId]/conversas/route.ts, que o polling da lista usa). Fixadas
  // sempre primeiro.
  conversations.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const ta = a.messages[0]?.createdAt.getTime() ?? a.updatedAt.getTime();
    const tb = b.messages[0]?.createdAt.getTime() ?? b.updatedAt.getTime();
    return tb - ta;
  });

  return (
    <WhatsappInbox
      agentId={config.id}
      agentName={config.nome}
      currentUserId={user.id}
      isManager={isManager}
      initialSignatureEnabled={config.signatureEnabled}
      initialLeadStatuses={leadStatuses.map(s => ({ id: s.id, name: s.name, color: s.color, order: s.order }))}
      initialSelectedId={c ?? null}
      initialConversations={conversations.map(c => ({
        id: c.id,
        contactName: c.contactName,
        contactNumber: c.contactNumber,
        status: c.status,
        humanTakeover: c.humanTakeover,
        leadStatusId: c.leadStatusId,
        opportunities: c.opportunities.map(o => ({ id: o.id, title: o.title, dealValue: o.dealValue, wonAt: o.wonAt?.toISOString() ?? null })),
        assignedToId: c.assignedToId,
        updatedAt: c.updatedAt.toISOString(),
        lastReadAt: c.lastReadAt?.toISOString() ?? null,
        lastMessage: c.messages[0]?.content ?? null,
        lastMessageRole: c.messages[0]?.role ?? null,
        lastMessageAt: c.messages[0]?.createdAt.toISOString() ?? null,
        etiquetas: c.etiquetas,
        unreadCount: unreadMap.get(c.id) ?? 0,
        pinned: c.pinned,
      }))}
    />
  );
}
