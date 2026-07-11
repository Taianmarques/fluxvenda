import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listMyAgentConfigs } from "@/lib/team";
import { CrmSidebar } from "../CrmSidebar";

// Diferente de crm/[agentId]/layout.tsx, esse layout funciona mesmo sem nenhum agente
// criado ainda — é o único lugar do CRM alcançável nesse estado (CrmSidebar mostra só o
// item "Hub" quando agentId vem vazio).
export default async function CrmHubLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const result = await listMyAgentConfigs(user.id);
  // Defensivo: só chega aqui sem time nenhum se o ProductGate("CRM") de /crm falhar em
  // barrar antes — evita loop com o redirect de /crm pro Hub quando não há agentes.
  if (!result) redirect("/dashboard");

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-950">
      <CrmSidebar agentId={result.configs[0]?.id ?? ""} agents={result.configs.map(c => ({ id: c.id, nome: c.nome }))} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
