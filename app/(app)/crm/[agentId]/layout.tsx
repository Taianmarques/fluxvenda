import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAgentConfigWithRole } from "@/lib/team";
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
  const result = await getAgentConfigWithRole(user.id, agentId);
  if (!result) redirect("/crm");

  return (
    <div className="h-full flex bg-gray-950">
      <CrmSidebar agentId={agentId} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
