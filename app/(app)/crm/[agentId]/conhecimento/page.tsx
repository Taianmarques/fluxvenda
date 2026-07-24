import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { ConhecimentoClient } from "../../conhecimento/ConhecimentoClient";

export default function ConhecimentoPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="conhecimento">
      <ConhecimentoPageContent {...props} />
    </CrmPageGate>
  );
}

async function ConhecimentoPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  if (!result) redirect("/crm");

  const itens = await prisma.conhecimentoItem.findMany({
    where: { agentConfigId: result.config.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, titulo: true, conteudo: true, active: true },
  });

  return <ConhecimentoClient agentId={result.config.id} isManager={result.isManager} itens={itens} />;
}
