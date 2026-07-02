import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Target } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { ProspeccaoClient } from "../../prospeccao/ProspeccaoClient";

export default async function ProspeccaoPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Target size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente antes de usar a prospecção.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  const prospects = await prisma.prospect.findMany({
    where: { agentConfigId: config.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProspeccaoClient
      agentId={config.id}
      initialProspeccaoEnabled={config.prospeccaoEnabled}
      initialSegmento={config.prospeccaoSegmento}
      initialRegiao={config.prospeccaoRegiao}
      initialMensagemInicial={config.prospeccaoMensagemInicial}
      initialFollowupDias={(config.prospeccaoFollowupDias as number[]) ?? [3, 7, 14]}
      initialProspects={prospects.map(p => ({
        id: p.id, nome: p.nome, empresa: p.empresa, telefone: p.telefone,
        segmento: p.segmento, regiao: p.regiao, status: p.status,
        notas: p.notas, abordagemCount: p.abordagemCount,
        lastAbordagemAt: p.lastAbordagemAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
