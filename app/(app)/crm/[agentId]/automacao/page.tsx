import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { AutomacaoClient } from "../../automacao/AutomacaoClient";

export default function AutomacaoPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="automacao">
      <AutomacaoPageContent {...props} />
    </CrmPageGate>
  );
}

async function AutomacaoPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Zap size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente para criar automações.</p>
          <Link href={`/crm/${agentId}/configurar`} className="inline-block bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium">
            Configurar agente
          </Link>
        </div>
      </div>
    );
  }

  return <AutomacaoClient agentId={config.id} />;
}
