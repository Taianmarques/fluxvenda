import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { CobrancaClient } from "../../cobranca/CobrancaClient";

export default function CobrancaPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="cobranca">
      <CobrancaPageContent {...props} />
    </CrmPageGate>
  );
}

async function CobrancaPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config) {
    return (
      <div className="h-full bg-gray-950 p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Landmark size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Agente não encontrado</h1>
          <p className="text-gray-400">Esse agente não existe ou você não tem acesso a ele.</p>
          <Link href="/crm/hub" className="inline-block bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium">
            Voltar ao Hub
          </Link>
        </div>
      </div>
    );
  }

  const cobrancas = await prisma.cobranca.findMany({
    where: { agentConfigId: config.id },
    orderBy: { vencimento: "asc" },
  });

  return (
    <CobrancaClient
      agentId={config.id}
      initialCobrancaEnabled={config.cobrancaEnabled}
      initialHasAsaasApiKey={Boolean(config.asaasApiKey)}
      initialAsaasSandbox={config.asaasSandbox}
      initialCobrancas={cobrancas.map(c => ({
        id: c.id,
        nomeDevedor: c.nomeDevedor,
        contactNumber: c.contactNumber,
        valor: c.valor,
        descricao: c.descricao,
        vencimento: c.vencimento.toISOString(),
        status: c.status,
        recorrencia: c.recorrencia,
        boletoUrl: c.boletoUrl,
        paidAt: c.paidAt?.toISOString() ?? null,
      }))}
    />
  );
}
