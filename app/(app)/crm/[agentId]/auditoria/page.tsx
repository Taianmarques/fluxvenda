import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck, Lock } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { AuditoriaClient } from "../../auditoria/AuditoriaClient";

export default async function AuditoriaPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;
  const isManager = result?.isManager ?? false;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <ClipboardCheck size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente ativo</h1>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  // Auditoria é ferramenta do gestor — atendentes não veem avaliações uns dos outros
  if (!isManager) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Lock size={48} className="mx-auto text-gray-600" />
          <h1 className="text-2xl font-bold">Restrito ao gestor</h1>
          <p className="text-gray-400">A auditoria de conversas é uma ferramenta de gestão da equipe.</p>
        </div>
      </div>
    );
  }

  const team = await prisma.team.findUnique({
    where: { id: config.teamId },
    include: {
      manager: { select: { id: true, name: true } },
      members: { include: { profile: { select: { id: true, name: true } } }, orderBy: { joinedAt: "asc" } },
    },
  });

  const atendentes = team
    ? [
        { id: team.manager.id, name: `${team.manager.name} (gestor)` },
        ...team.members.map(m => ({ id: m.profile.id, name: m.profile.name })),
      ]
    : [];

  return <AuditoriaClient agentId={config.id} atendentes={atendentes} />;
}
