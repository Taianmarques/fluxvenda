import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { EquipeClient } from "../../equipe/EquipeClient";

export default async function EquipeCrmPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;
  const isManager = result?.isManager ?? false;

  if (!config) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <UserPlus size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Agente não encontrado</h1>
          <Link href="/crm" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Voltar ao CRM
          </Link>
        </div>
      </div>
    );
  }

  const team = await prisma.team.findUnique({
    where: { id: config.teamId },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      members: {
        include: { profile: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!team) redirect("/crm");

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/entrar/${team.invite}`;

  return (
    <EquipeClient
      teamName={team.name}
      isManager={isManager}
      inviteLink={isManager ? inviteLink : null}
      manager={{ id: team.manager.id, name: team.manager.name, email: team.manager.email }}
      members={team.members.map(m => ({
        memberId: m.id,
        profileId: m.profile.id,
        name: m.profile.name,
        email: m.profile.email,
        joinedAt: m.joinedAt.toISOString(),
      }))}
      currentUserId={user.id}
    />
  );
}
