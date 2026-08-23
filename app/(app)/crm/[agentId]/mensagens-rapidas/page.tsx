import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { MensagensRapidasClient } from "../../mensagens-rapidas/MensagensRapidasClient";

export default function MensagensRapidasPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="mensagensrapidas">
      <MensagensRapidasPageContent {...props} />
    </CrmPageGate>
  );
}

async function MensagensRapidasPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  if (!result) redirect("/crm");

  const quickReplies = await prisma.quickReply.findMany({
    where: { agentConfigId: result.config.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, content: true },
  });

  return <MensagensRapidasClient agentId={result.config.id} quickReplies={quickReplies} />;
}
