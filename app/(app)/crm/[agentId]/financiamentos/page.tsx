import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Car } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { FinancimentosClient } from "../../financiamentos/FinancimentosClient";

export default async function FinancimentosPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Car size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente antes de usar o módulo de financiamentos.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  const simulations = await prisma.financingSimulation.findMany({
    where: { agentConfigId: config.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const isGestor = result?.isManager === true;

  return (
    <FinancimentosClient
      agentId={config.id}
      isGestor={isGestor}
      initialFinancingEnabled={config.financingEnabled}
      initialBvSandbox={config.bvSandbox}
      initialHasBvCredentials={!!(config.bvClientId && config.bvClientSecret)}
      initialSimulations={simulations.map(s => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        contactNumber: s.contactNumber,
        nomeCliente: s.nomeCliente,
        cpf: s.cpf ? s.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "***.$2.$3-**") : "",
        dataNascimento: s.dataNascimento,
        possuiHabilitacao: s.possuiHabilitacao,
        valorVeiculo: s.valorVeiculo,
        valorEntrada: s.valorEntrada,
        prazoMeses: s.prazoMeses,
        valorParcela: s.valorParcela,
        taxaMensal: s.taxaMensal,
        cet: s.cet,
        valorTotal: s.valorTotal,
        status: s.status,
        notas: s.notas,
      }))}
    />
  );
}
