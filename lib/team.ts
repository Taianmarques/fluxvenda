import { prisma } from "@/lib/prisma";

// Acha a equipe do usuário (dono via Team.managerId, ou atendente via TeamMember) e lista
// TODOS os agentes de WhatsApp dessa equipe — uma equipe pode ter vários agentes simultâneos,
// cada um com seu próprio número/CRM. Um membro marcado como coManager (ver EquipeClient)
// também vira isManager: true — mesmo nível de acesso do dono, mas sem ser o dono de fato.
export async function listMyAgentConfigs(userId: string) {
  const ownTeam = await prisma.team.findUnique({ where: { managerId: userId } });
  if (ownTeam) {
    const configs = await prisma.agentConfig.findMany({ where: { teamId: ownTeam.id }, orderBy: { createdAt: "asc" } });
    return { isManager: true, teamId: ownTeam.id, configs };
  }

  const membership = await prisma.teamMember.findUnique({ where: { profileId: userId } });
  if (!membership) return null;
  const configs = await prisma.agentConfig.findMany({ where: { teamId: membership.teamId }, orderBy: { createdAt: "asc" } });
  return { isManager: membership.coManager, teamId: membership.teamId, configs };
}

// Diz se userId pode administrar a equipe (criar/editar/excluir departamentos, perfis,
// membros) — dono literal (teamManagerId) ou membro marcado coManager. Usado nas rotas
// de /api/equipe/*, que já têm o managerId da equipe em mãos (evita reconsultar o Team).
export async function isTeamManager(userId: string, teamId: string, teamManagerId: string) {
  if (teamManagerId === userId) return true;
  const membership = await prisma.teamMember.findUnique({ where: { profileId: userId } });
  return membership?.teamId === teamId && membership.coManager === true;
}

// Time onde o usuário administra — dono (Team.managerId) ou membro coManager. Usado nas
// rotas que ainda não têm um Team/registro carregado pra checar via isTeamManager.
export async function getManagedTeam(userId: string) {
  const ownTeam = await prisma.team.findUnique({ where: { managerId: userId } });
  if (ownTeam) return ownTeam;
  const membership = await prisma.teamMember.findUnique({ where: { profileId: userId }, include: { team: true } });
  return membership?.coManager ? membership.team : null;
}

// Valida que agentConfigId pertence à equipe do usuário (gestor ou atendente) e devolve o
// config junto com a flag de papel — usado pra escopar CRM/Ferramentas num agente específico.
export async function getAgentConfigWithRole(userId: string, agentConfigId: string) {
  const result = await listMyAgentConfigs(userId);
  if (result) {
    const config = result.configs.find(c => c.id === agentConfigId);
    if (config) return { config, isManager: result.isManager };
  }

  // Super admin pode abrir contas de exemplo (Team.isDemo) pra demonstração, mesmo sem ser
  // gestor/membro delas — nunca vale pra equipes reais de cliente.
  const config = await prisma.agentConfig.findUnique({ where: { id: agentConfigId } });
  if (!config) return null;
  const team = await prisma.team.findUnique({ where: { id: config.teamId }, select: { isDemo: true } });
  if (!team?.isDemo) return null;
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN" ? { config, isManager: true } : null;
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

// Atendente não-gestor não pode ver/agir numa conversa de grupo quando ela tem uma lista de
// visibilidade configurada e ele não está nela (lista vazia = todo mundo vê, padrão).
export function negadoGrupoParaAtendente(
  conversation: { isGroup?: boolean; groupVisibleToIds?: string[] },
  userId: string
): boolean {
  if (!conversation.isGroup) return false;
  const lista = conversation.groupVisibleToIds ?? [];
  return lista.length > 0 && !lista.includes(userId);
}
