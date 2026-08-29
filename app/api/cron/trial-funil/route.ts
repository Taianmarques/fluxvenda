import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { renderMessageTemplate } from "@/lib/message-templates";
import { buildCrmChecklist } from "@/lib/crm-onboarding";
import { TRIAL_FUNNEL_STEPS } from "@/lib/trial-funnel-shared";

// Fallback caso o seed da migration nunca tenha rodado (banco restaurado de backup antigo) —
// mesmo texto da migration 20260829040000_trial_funnel.
const FALLBACKS: Record<string, string> = {
  TRIAL_CHECKLIST_NUDGE:
    "Olá, {{name}}! 👋\n\nVi que você ainda não começou a configurar seu CRM. Que tal dar o primeiro passo agora? Leva só alguns minutinhos: conecte seu WhatsApp, convide sua equipe ou personalize seu funil de vendas.\n\nQualquer dúvida, é só responder aqui! 🚀",
  TRIAL_DEMO_INVITE:
    'Olá, {{name}}! 👋\n\nQue tal agendar uma demonstração gratuita com um especialista? Em poucos minutos a gente te mostra como tirar o máximo proveito do CRM pro seu negócio.\n\nÉ só acessar o Hub e clicar em "Agendar demonstração". 📅',
  TRIAL_SOCIAL_PROOF_1:
    "Olá, {{name}}! 👋\n\nSabia que empresas que usam o CRM da FluxVenda reduzem o tempo de resposta ao cliente em até 70%? A IA cuida do primeiro atendimento enquanto sua equipe foca em fechar negócio.\n\nContinue explorando o CRM — o resultado aparece rápido! 📈",
  TRIAL_SOCIAL_PROOF_2:
    'Olá, {{name}}! 👋\n\n"Depois que começamos a usar o CRM, nunca mais perdemos um lead por falta de resposta." — é o que a gente ouve de clientes todos os dias.\n\nJá configurou seu pipeline de vendas? Isso ajuda a IA a saber exatamente o que fazer em cada etapa. 🎯',
  TRIAL_SOCIAL_PROOF_3:
    "Olá, {{name}}! 👋\n\nSeu teste grátis está quase acabando! Empresas que continuam com o CRM depois do teste relatam aumento médio de 30% nas vendas fechadas pela IA.\n\nGaranta acesso completo antes que o teste expire. 🚀",
};

// Roda o checklist inicial (mesmo usado no Hub) pra saber se a equipe ainda não mexeu em
// nada — usado só pela etapa TRIAL_CHECKLIST_NUDGE.
async function checklistEstaVazio(teamId: string): Promise<boolean> {
  const configs = await prisma.agentConfig.findMany({
    where: { teamId },
    select: { id: true, uazapiToken: true, cloudApiPhoneNumberId: true, systemPrompt: true },
  });
  const agentIds = configs.map(c => c.id);

  const [teamMemberCount, instagramConnections, pipelines, team] = await Promise.all([
    prisma.teamMember.count({ where: { teamId } }),
    prisma.instagramConnection.findMany({ where: { agentConfigId: { in: agentIds } }, select: { agentConfigId: true } }),
    prisma.pipeline.findMany({
      where: { agentConfigId: { in: agentIds } },
      select: {
        agentConfigId: true, name: true, agenteInstrucoes: true,
        stages: { select: { name: true, color: true, agenteInstrucoes: true, followupDelaysMinutes: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { crmTrialEndsAt: true, productsOwned: true } }),
  ]);

  const checklist = buildCrmChecklist({
    configs,
    instagramAgentIds: new Set(instagramConnections.map(c => c.agentConfigId)),
    pipelines,
    teamMemberCount,
    team,
  });
  return checklist.every(step => !step.done);
}

// Cron do funil de acompanhamento do teste grátis do CRM (7 dias) — separado do funil de
// boas-vindas/onboarding da plataforma (esse dispara 1x no cadastro; este manda uma
// sequência ao longo do trial pra reduzir abandono). Disparado externamente com:
// Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teams = await prisma.team.findMany({
    where: { crmTrialEndsAt: { gt: new Date() } },
    select: { id: true, createdAt: true, manager: { select: { name: true, phone: true } } },
  });

  let enviados = 0;
  let pulados = 0;

  for (const team of teams) {
    if (!team.manager.phone) continue;
    const elapsedHours = (Date.now() - team.createdAt.getTime()) / 3_600_000;

    for (const step of TRIAL_FUNNEL_STEPS) {
      if (elapsedHours < step.anchorHours) continue;

      const jaProcessado = await prisma.trialFunnelSent.findUnique({
        where: { teamId_stepId: { teamId: team.id, stepId: step.id } },
      });
      if (jaProcessado) continue;

      let podeEnviar = true;
      if (step.id === "TRIAL_CHECKLIST_NUDGE") {
        podeEnviar = await checklistEstaVazio(team.id);
      } else if (step.id === "TRIAL_DEMO_INVITE") {
        const demo = await prisma.demoBooking.findFirst({ where: { teamId: team.id, status: "AGENDADO" } });
        podeEnviar = !demo;
      }

      if (!podeEnviar) {
        // Condição não bate (ex: já agendou demo) — marca como processado pra não
        // reavaliar pra sempre, mas não conta como falha de envio.
        await prisma.trialFunnelSent.create({ data: { teamId: team.id, stepId: step.id } });
        pulados++;
        continue;
      }

      try {
        const message = await renderMessageTemplate(step.id, { name: team.manager.name }, FALLBACKS[step.id]);
        const sentId = await sendWhatsAppText(team.manager.phone, message);
        // Sem checar o retorno, a etapa seria marcada como processada mesmo quando a
        // mensagem nunca saiu de fato — tenta de novo na próxima execução se falhar.
        if (!sentId) throw new Error("Instância de WhatsApp não confirmou o envio");
        await prisma.trialFunnelSent.create({ data: { teamId: team.id, stepId: step.id } });
        enviados++;
      } catch (err) {
        console.error(`[cron/trial-funil] erro na etapa ${step.id} da equipe ${team.id}:`, err);
      }
    }
  }

  return NextResponse.json({ teams: teams.length, enviados, pulados });
}
