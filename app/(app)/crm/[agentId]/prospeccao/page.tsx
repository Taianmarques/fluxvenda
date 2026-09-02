import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Target } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { ProspeccaoClient } from "../../prospeccao/ProspeccaoClient";

export default function ProspeccaoPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="prospeccao">
      <ProspeccaoPageContent {...props} />
    </CrmPageGate>
  );
}

async function ProspeccaoPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config) {
    return (
      <div className="h-full bg-gray-950 p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Target size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Agente não encontrado</h1>
          <p className="text-gray-400">Esse agente não existe ou você não tem acesso a ele.</p>
          <Link href="/crm/hub" className="inline-block bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium">
            Voltar ao Hub
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
      initialRitmo={config.prospeccaoRitmo as "seguro" | "moderado" | "rapido"}
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
