import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listMyAgentConfigs } from "@/lib/team";
import { getCrmAllowedPages } from "@/lib/crm-access";
import { CrmSidebar } from "../CrmSidebar";
import { TrialBanner } from "../../TrialBanner";

// Diferente de crm/[agentId]/layout.tsx, esse layout funciona mesmo sem nenhum agente
// criado ainda — é o único lugar do CRM alcançável nesse estado (CrmSidebar mostra só o
// item "Hub" quando agentId vem vazio).
export default async function CrmHubLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const [result, allowedPages] = await Promise.all([
    listMyAgentConfigs(user.id),
    getCrmAllowedPages(user.id),
  ]);
  // Defensivo: só chega aqui sem time nenhum se o ProductGate("CRM") de /crm falhar em
  // barrar antes — evita loop com o redirect de /crm pro Hub quando não há agentes.
  if (!result) redirect("/dashboard");

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <TrialBanner />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <CrmSidebar agentId={result.configs[0]?.id ?? ""} agents={result.configs.map(c => ({ id: c.id, nome: c.nome }))} allowedPages={allowedPages} isManager={result.isManager} />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
