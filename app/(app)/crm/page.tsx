import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listMyAgentConfigs } from "@/lib/team";
import { ProductGate } from "../ProductGate";

// Entry point sem agente específico: manda pro primeiro agente da equipe (mais antigo),
// ou pro Hub de agentes se ainda não existir nenhum (lá dá pra criar o primeiro).
// Os links fixos do app (sidebar, etc.) continuam apontando pra "/crm" sem id.
export default async function CrmEntryPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <ProductGate product="CRM">
      <CrmRedirect userId={user.id} />
    </ProductGate>
  );
}

async function CrmRedirect({ userId }: { userId: string }) {
  const result = await listMyAgentConfigs(userId);
  const firstAgent = result?.configs[0];

  return redirect(firstAgent ? `/crm/${firstAgent.id}` : "/crm/hub");
}
