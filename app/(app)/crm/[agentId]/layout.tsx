import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listMyAgentConfigs } from "@/lib/team";
import { getCrmAllowedPages } from "@/lib/crm-access";
import { CrmSidebar } from "../CrmSidebar";

export default async function CrmAgentLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: Promise<{ agentId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const [result, allowedPages] = await Promise.all([
    listMyAgentConfigs(user.id),
    getCrmAllowedPages(user.id),
  ]);
  if (!result || !result.configs.some(c => c.id === agentId)) redirect("/crm");

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-950">
      <CrmSidebar agentId={agentId} agents={result.configs.map(c => ({ id: c.id, nome: c.nome }))} allowedPages={allowedPages} isManager={result.isManager} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
