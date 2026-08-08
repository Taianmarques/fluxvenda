import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { getAgentConfigAsManager } from "@/lib/team";
import { SimuladorClient } from "../../SimuladorClient";

export default async function SimuladorPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(user.id, agentId);
  if (!config?.systemPrompt) redirect("/ferramentas");

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href={`/ferramentas/whatsapp/${agentId}`} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 w-fit">
            <ArrowLeft size={12} /> Voltar pro agente
          </Link>
          <h1 className="text-3xl font-bold mt-2 flex items-center gap-2"><FlaskConical size={28} className="text-blue-400" /> Simulador de conversa</h1>
        </div>

        <SimuladorClient agentId={agentId} />
      </div>
    </div>
  );
}
