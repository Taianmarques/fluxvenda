import "server-only";
import { prisma } from "@/lib/prisma";
import { sendHotLeadAlertEmail } from "@/lib/email";

// Avisa o comercial quando uma equipe em teste grátis do CRM mostra sinal de interesse forte
// (ver chamadas em app/api/equipe/membros/route.ts, app/api/planos-view/route.ts e
// app/api/agentes/[agentId]/contatos/route.ts). Só dispara pra quem ainda está em trial e
// ainda não converteu (senão é só ruído pro comercial) — e só uma vez por equipe, mesmo que
// vários gatilhos diferentes batam depois.
export async function maybeAlertHotLead(teamId: string, motivo: string): Promise<void> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      name: true,
      crmTrialEndsAt: true,
      hotLeadAlertedAt: true,
      manager: { select: { name: true, email: true } },
      planPurchases: { where: { status: "PAGO" }, select: { id: true }, take: 1 },
    },
  });
  if (!team || !team.crmTrialEndsAt || team.hotLeadAlertedAt || team.planPurchases.length > 0) return;

  await prisma.team.update({ where: { id: teamId }, data: { hotLeadAlertedAt: new Date() } });
  await sendHotLeadAlertEmail(team.name, team.manager.name, team.manager.email, motivo).catch(() => {});
}
