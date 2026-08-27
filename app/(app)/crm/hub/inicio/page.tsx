import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { listMyAgentConfigs } from "@/lib/team";
import { buildCrmChecklist } from "@/lib/crm-onboarding";
import { GettingStartedChecklist } from "../GettingStartedChecklist";
import { RecursosSidebar } from "../RecursosSidebar";
import { VerPlanosCard } from "../VerPlanosCard";

// Página de boas-vindas — separada do Hub de agentes (catálogo). É pra onde o
// onboarding do CRM manda quem acabou de se cadastrar (via /crm -> zero agentes).
export default async function CrmInicioPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const [result, profile] = await Promise.all([
    listMyAgentConfigs(user.id),
    prisma.profile.findUnique({ where: { id: user.id }, select: { name: true } }),
  ]);
  if (!result) redirect("/crm");
  if (!result.isManager) redirect("/crm/hub");

  const { configs, teamId } = result;
  const firstName = (profile?.name ?? "").split(" ")[0] || "tudo bem";

  const [team, teamMemberCount, instagramConnections, pipelines] = await Promise.all([
    prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { crmTrialEndsAt: true, productsOwned: true } }),
    prisma.teamMember.count({ where: { teamId } }),
    prisma.instagramConnection.findMany({
      where: { agentConfigId: { in: configs.map(c => c.id) } },
      select: { agentConfigId: true },
    }),
    prisma.pipeline.findMany({
      where: { agentConfigId: { in: configs.map(c => c.id) } },
      select: {
        agentConfigId: true, name: true, agenteInstrucoes: true,
        stages: { select: { name: true, color: true, agenteInstrucoes: true, followupDelaysMinutes: true }, orderBy: { order: "asc" } },
      },
    }),
  ]);

  const checklist = buildCrmChecklist({
    configs,
    instagramAgentIds: new Set(instagramConnections.map(c => c.agentConfigId)),
    pipelines,
    teamMemberCount,
    team,
  });

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-blue-50 text-gray-900 p-4 md:p-6 overflow-y-auto h-full flex items-center justify-center">
      <div className="max-w-4xl w-full py-6 grid md:grid-cols-[1fr_260px] gap-6 items-start">
        <GettingStartedChecklist steps={checklist} name={firstName} dismissHref="/crm/hub" />
        <div className="space-y-4">
          <RecursosSidebar />
          <VerPlanosCard />
        </div>
      </div>
    </div>
  );
}
