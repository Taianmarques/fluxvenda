import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { listMyAgentConfigs } from "@/lib/team";

// Entry point sem agente específico: manda pro primeiro agente da equipe (mais antigo).
// Os links fixos do app (sidebar, etc.) continuam apontando pra "/crm" sem id.
export default async function CrmEntryPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const result = await listMyAgentConfigs(user.id);
  const firstAgent = result?.configs[0];

  if (!firstAgent) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <MessageCircle size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento para ver as conversas aqui.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  redirect(`/crm/${firstAgent.id}`);
}
