import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAgentConfigWithRole } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { CondicoesClient } from "../../condicoes/CondicoesClient";

export default function CondicoesPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="condicoes">
      <CondicoesPageContent {...props} />
    </CrmPageGate>
  );
}

async function CondicoesPageContent({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  if (!result) redirect("/crm");

  const { config } = result;

  const [igConnection, flows, funnels] = await Promise.all([
    prisma.instagramConnection.findUnique({
      where: { agentConfigId: agentId },
      select: { instagramUsername: true },
    }),
    prisma.instagramCommentFlow.findMany({
      where: { agentConfigId: agentId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, keywords: true, replyMessage: true, funnelId: true, order: true, active: true },
    }),
    prisma.instagramFunnel.findMany({
      where: { agentConfigId: agentId },
      include: { blocks: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <CondicoesClient
      agentId={agentId}
      igConnected={!!igConnection}
      igUsername={igConnection?.instagramUsername ?? null}
      igCommentAutoDm={config.igCommentAutoDm}
      igCommentDmMessage={config.igCommentDmMessage}
      initialFlows={flows}
      initialFunnels={funnels.map((f) => ({
        id: f.id,
        name: f.name,
        active: f.active,
        dmTriggerEnabled: f.dmTriggerEnabled,
        dmTriggerKeywords: f.dmTriggerKeywords,
        blocks: f.blocks.map((b) => ({
          id: b.id,
          type: b.type as "MESSAGE" | "DELAY" | "CONDITION",
          order: b.order,
          content: b.content ?? undefined,
          delayMinutes: b.delayMinutes ?? undefined,
          branches: (b.branches as any) ?? undefined,
        })),
      }))}
    />
  );
}
