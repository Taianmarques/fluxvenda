import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listMyAgentConfigs } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { CanaisClient } from "../../canais/CanaisClient";

export default function CanaisPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="canais">
      <CanaisPageContent {...props} />
    </CrmPageGate>
  );
}

async function CanaisPageContent({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  await params;
  const result = await listMyAgentConfigs(user.id);
  if (!result) redirect("/crm");

  const agentIds = result.configs.map((c) => c.id);

  const [igConnections, igFlows] = await Promise.all([
    prisma.instagramConnection.findMany({
      where: { agentConfigId: { in: agentIds } },
      select: { agentConfigId: true, instagramUsername: true, instagramBusinessAccountId: true },
    }),
    prisma.instagramCommentFlow.findMany({
      where: { agentConfigId: { in: agentIds } },
      orderBy: { order: "asc" },
      select: { id: true, agentConfigId: true, name: true, keywords: true, replyMessage: true, order: true, active: true },
    }),
  ]);

  const igByAgent: Record<string, { username: string; businessAccountId: string }> = {};
  for (const ig of igConnections) {
    igByAgent[ig.agentConfigId] = {
      username: ig.instagramUsername,
      businessAccountId: ig.instagramBusinessAccountId,
    };
  }

  const flowsByAgent: Record<string, typeof igFlows> = {};
  for (const f of igFlows) {
    if (!flowsByAgent[f.agentConfigId]) flowsByAgent[f.agentConfigId] = [];
    flowsByAgent[f.agentConfigId].push(f);
  }

  const channels = result.configs.map((c) => ({
    id: c.id,
    nome: c.nome,
    segmento: c.segmento,
    subsegmento: c.subsegmento,
    active: c.active,
    whatsappAiPaused: c.whatsappAiPaused,
    instagramAiPaused: c.instagramAiPaused,
    uazapiToken: c.uazapiToken,
    igCommentAutoDm: c.igCommentAutoDm,
    igCommentDmMessage: c.igCommentDmMessage,
    igCommentFlows: flowsByAgent[c.id] ?? [],
    instagram: igByAgent[c.id] ?? null,
  }));

  return <CanaisClient initialChannels={channels} isManager={result.isManager} />;
}
