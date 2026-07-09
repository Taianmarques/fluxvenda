import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAgentConfigWithRole } from "@/lib/team";
import { LigacoesClient } from "@/app/(app)/crm/ligacoes/LigacoesClient";

export default async function LigacoesPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const access = await getAgentConfigWithRole(user.id, agentId);
  if (!access) redirect("/crm");

  return <LigacoesClient agentId={agentId} />;
}
