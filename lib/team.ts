import { prisma } from "@/lib/prisma";

// Acha a equipe do usuário (dono via Team.managerId, ou atendente via TeamMember) e lista
// TODOS os agentes de WhatsApp dessa equipe — uma equipe pode ter vários agentes simultâneos,
// cada um com seu próprio número/CRM.
export async function listMyAgentConfigs(userId: string) {
  const ownTeam = await prisma.team.findUnique({ where: { managerId: userId } });
  if (ownTeam) {
    const configs = await prisma.agentConfig.findMany({ where: { teamId: ownTeam.id }, orderBy: { createdAt: "asc" } });
    return { isManager: true as const, teamId: ownTeam.id, configs };
  }

  const membership = await prisma.teamMember.findUnique({ where: { profileId: userId } });
  if (!membership) return null;
  const configs = await prisma.agentConfig.findMany({ where: { teamId: membership.teamId }, orderBy: { createdAt: "asc" } });
  return { isManager: false as const, teamId: membership.teamId, configs };
}

// Valida que agentConfigId pertence à equipe do usuário (gestor ou atendente) e devolve o
// config junto com a flag de papel — usado pra escopar CRM/Ferramentas num agente específico.
export async function getAgentConfigWithRole(userId: string, agentConfigId: string) {
  const result = await listMyAgentConfigs(userId);
  if (!result) return null;
  const config = result.configs.find(c => c.id === agentConfigId);
  return config ? { config, isManager: result.isManager } : null;
}

// Configuração do agente (Ferramentas > WhatsApp): só o gestor pode editar nome, tom,
// follow-up, etc. Atendentes usam o CRM mas não reconfiguram o agente.
export async function getAgentConfigAsManager(userId: string, agentConfigId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) return null;
  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return null;
  return prisma.agentConfig.findFirst({ where: { id: agentConfigId, teamId: team.id } });
}

// Verifica se o usuário pertence à equipe (como gestor ou atendente) que é dona desse
// agentConfigId — usado pra validar acesso a um recurso já carregado (ex: uma conversa),
// quando não é preciso saber se é gestor ou atendente.
export async function userBelongsToAgentConfig(userId: string, agentConfigId: string) {
  const result = await getAgentConfigWithRole(userId, agentConfigId);
  return result !== null;
}
