import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { listMyAgentConfigs } from "@/lib/team";
import { ProductGate } from "../ProductGate";

// Entry point sem agente específico: manda pro primeiro agente da equipe (mais antigo),
// ou pra página de boas-vindas (checklist de primeiros passos) se ainda não existir
// nenhum agente — essa página já redireciona pro Hub se quem chegou não for gestor.
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

  return redirect(firstAgent ? `/crm/${firstAgent.id}` : "/crm/hub/inicio");
}
