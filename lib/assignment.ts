import { prisma } from "@/lib/prisma";

// Atendentes elegíveis pra receber leads automaticamente (rodízio/IA): membros da equipe,
// na ordem em que entraram — define a fila. O gestor não entra nessa fila (ele já vê tudo).
async function getEligibleAttendants(teamId: string): Promise<string[]> {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    orderBy: { joinedAt: "asc" },
    select: { profileId: true },
  });
  return members.map(m => m.profileId);
}

// Escolhe o próximo atendente na fila do rodízio, atribui a conversa a ele e avança a fila.
export async function assignNextAttendant(agentConfigId: string, teamId: string, conversationId: string): Promise<string | null> {
  const attendants = await getEligibleAttendants(teamId);
  if (attendants.length === 0) return null;

  const config = await prisma.agentConfig.findUnique({ where: { id: agentConfigId }, select: { lastAssignedToId: true } });
  const lastIndex = config?.lastAssignedToId ? attendants.indexOf(config.lastAssignedToId) : -1;
  const next = attendants[(lastIndex + 1) % attendants.length];

  await prisma.$transaction([
    prisma.agentConfig.update({ where: { id: agentConfigId }, data: { lastAssignedToId: next } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { assignedToId: next } }),
  ]);

  return next;
}
