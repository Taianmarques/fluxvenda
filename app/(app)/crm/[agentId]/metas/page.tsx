import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { MetasClient } from "../../metas/MetasClient";

export default function MetasPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="metas">
      <MetasPageContent {...props} />
    </CrmPageGate>
  );
}

async function MetasPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;
  if (!config) redirect("/crm");

  const team = await prisma.team.findUnique({
    where: { id: config.teamId },
    include: {
      manager: { select: { id: true, name: true } },
      members: { include: { profile: { select: { id: true, name: true } } }, orderBy: { joinedAt: "asc" } },
    },
  });

  const attendants = team
    ? [
        { id: team.manager.id, name: team.manager.name },
        ...team.members.map(m => ({ id: m.profile.id, name: m.profile.name })),
      ]
    : [];

  return (
    <MetasClient
      agentId={config.id}
      initialMetaGeralMensal={config.metaGeralMensal}
      initialMetasPorVendedor={config.metasPorVendedor as Record<string, number>}
      initialInvestimentoMensal={config.investimentoMensal}
      attendants={attendants}
    />
  );
}
