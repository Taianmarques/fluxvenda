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

  const membership = await prisma.teamMember.findUnique({
    where: { profileId: userId },
    include: { profile: { select: { role: true } } },
  });
  if (!membership) return null;
  const configs = await prisma.agentConfig.findMany({ where: { teamId: membership.teamId }, orderBy: { createdAt: "asc" } });
  // Atendente promovido a GESTOR na tela Equipe (segundo dono) tem o mesmo acesso do dono
  // original: enxerga tudo, sem o filtro de "só as conversas atribuídas a mim". ADMIN é o
  // super-admin da plataforma inteira (área /admin, todos os clientes) — nunca conta aqui, e
  // nunca é atribuível a um TeamMember (ver validação em app/api/equipe/membros/[memberId]/route.ts).
  const isManager = membership.profile.role === "GESTOR";
  return { isManager, teamId: membership.teamId, configs };
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
  if (!profile) return null;

  const ownTeam = await prisma.team.findUnique({ where: { managerId: userId } });
  if (ownTeam && (profile.role === "GESTOR" || profile.role === "ADMIN")) {
    return prisma.agentConfig.findFirst({ where: { id: agentConfigId, teamId: ownTeam.id } });
  }

  // Atendente promovido a GESTOR (ver tela Equipe) também edita a config do agente, igual ao
  // dono original. ADMIN nunca é atribuível a um TeamMember (é o super-admin da plataforma
  // inteira), então não entra nesse segundo caminho.
  if (profile.role === "GESTOR") {
    const membership = await prisma.teamMember.findUnique({ where: { profileId: userId } });
    if (membership) return prisma.agentConfig.findFirst({ where: { id: agentConfigId, teamId: membership.teamId } });
  }

  return null;
}

// Verifica se o usuário pertence à equipe (como gestor ou atendente) que é dona desse
// agentConfigId — usado pra validar acesso a um recurso já carregado (ex: uma conversa),
// quando não é preciso saber se é gestor ou atendente.
export async function userBelongsToAgentConfig(userId: string, agentConfigId: string) {
  const result = await getAgentConfigWithRole(userId, agentConfigId);
  return result !== null;
}

// Atendente não-gestor não pode ver/agir numa conversa quando: (a) ela já é de outro colega, (b)
// está encerrada sem dono (ver isso em app/api/ferramentas/whatsapp/conversas/[id]/route.ts), ou
// (c) ainda está sem dono mas o agente tem um atendente padrão pro online (iaLeadAttendantId) e
// quem está olhando não é ele — nesse caso, contato novo sem atendimento só aparece pro atendente
// designado, não pro time inteiro (antes disso, qualquer não-gestor via/aceitava lead sem dono).
export function negadaParaAtendente(
  conversation: { assignedToId: string | null; status: string },
  userId: string,
  iaLeadAttendantId: string | null
): boolean {
  if (conversation.assignedToId) return conversation.assignedToId !== userId;
  if (conversation.status === "FINALIZADO") return true;
  if (iaLeadAttendantId) return iaLeadAttendantId !== userId;
  return false;
}

// Time que esse usuário administra: o dono literal (Team.managerId) OU um atendente promovido
// a GESTOR na tela Equipe — os dois administram a equipe (criar/remover usuário, departamentos,
// perfis de acesso etc) no mesmo nível. Team.managerId em si nunca muda por aqui — não existe
// "transferência de dono", só delegação de nível de acesso.
export async function getManagedTeam(userId: string) {
  const ownTeam = await prisma.team.findUnique({ where: { managerId: userId } });
  if (ownTeam) return ownTeam;

  const membership = await prisma.teamMember.findUnique({
    where: { profileId: userId },
    include: { profile: { select: { role: true } }, team: true },
  });
  return membership?.profile.role === "GESTOR" ? membership.team : null;
}
