import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";

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
    },
  });

  // Mesma lógica do WhatsApp: sobe pro topo pela hora da ÚLTIMA MENSAGEM, não pelo
  // updatedAt — que é tocado por qualquer mudança (marcar como lida, trocar status,
  // atribuir atendente...) e jogava conversa pro topo sem mensagem nova.
  conversations.sort((a, b) => {
    const ta = a.messages[0]?.createdAt.getTime() ?? a.updatedAt.getTime();
    const tb = b.messages[0]?.createdAt.getTime() ?? b.updatedAt.getTime();
    return tb - ta;
  });

  return NextResponse.json({ conversations });
}
