import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { MotivosPerdaClient } from "../../motivos-perda/MotivosPerdaClient";

export default function MotivosPerdaPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="motivosperda">
      <MotivosPerdaPageContent {...props} />
    </CrmPageGate>
  );
}

async function MotivosPerdaPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  if (!result) redirect("/crm");

  const motivos = await prisma.motivoPerda.findMany({
    where: { agentConfigId: result.config.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, nome: true },
  });

  return <MotivosPerdaClient agentId={result.config.id} isManager={result.isManager} motivos={motivos} />;
}
