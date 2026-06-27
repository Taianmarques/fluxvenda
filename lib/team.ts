import { prisma } from "@/lib/prisma";

// CRM (mensagens, pipeline, agenda, vendas): aberto ao gestor (dono da equipe) e a qualquer
// atendente que tenha entrado na equipe via código de convite (TeamMember), não importa o
// role — várias pessoas atendem pelo mesmo número de WhatsApp.
export async function getOwnAgentConfig(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) return null;

  const ownTeam = await prisma.team.findUnique({ where: { managerId: userId } });
  if (ownTeam) return prisma.agentConfig.findUnique({ where: { teamId: ownTeam.id } });

  const membership = await prisma.teamMember.findUnique({ where: { profileId: userId } });
  if (!membership) return null;
  return prisma.agentConfig.findUnique({ where: { teamId: membership.teamId } });
}

// Configuração do agente (Ferramentas > WhatsApp): só o gestor pode editar nome, tom,
// follow-up, etc. Atendentes usam o CRM mas não reconfiguram o agente.
export async function getOwnAgentConfigAsManager(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) return null;
  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return null;
  return prisma.agentConfig.findUnique({ where: { teamId: team.id } });
}

// Verifica se o usuário pertence à equipe (como gestor ou atendente) que é dona desse
// agentConfigId — usado pra validar acesso a um recurso já carregado.
export async function userBelongsToAgentConfig(userId: string, agentConfigId: string) {
  const config = await getOwnAgentConfig(userId);
  return config?.id === agentConfigId;
}
