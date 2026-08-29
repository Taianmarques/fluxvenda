import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { User } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { MeuDesempenhoTab } from "../../dashboards/MeuDesempenhoTab";

// Antes era uma aba dentro de Dashboards (?view=meudesempenho); virou página própria no
// menu Vendas, já que é conteúdo pessoal do vendedor, não um recorte gerencial do negócio.
export default function MeuDesempenhoPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="meudesempenho">
      <MeuDesempenhoPageContent {...props} />
    </CrmPageGate>
  );
}

async function MeuDesempenhoPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <User size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento para ver seu desempenho aqui.</p>
          <Link href={`/crm/${agentId}/configurar`} className="inline-block bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium">
            Configurar agente
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-gray-400 text-sm">Vendas</p>
          <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><User size={28} className="text-blue-400" /> Meu Desempenho</h1>
          <p className="text-gray-400 mt-1">Seus negócios e carteira de clientes — meta e negócios do mês atual.</p>
        </div>

        <MeuDesempenhoTab agentId={agentId} config={config} userId={user.id} />
      </div>
    </div>
  );
}
