import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { renderMessageTemplate } from "@/lib/message-templates";
import { buildCrmChecklist } from "@/lib/crm-onboarding";
import { TRIAL_FUNNEL_STEPS } from "@/lib/trial-funnel-shared";

// Fallback caso o seed da migration nunca tenha rodado (banco restaurado de backup antigo) —
// mesmo texto da migration 20260829050000_trial_funnel_v2.
const FALLBACKS: Record<string, string> = {
  TRIAL_D_2H_RECUPERAR:
    "Olá, {{name}}! 👋\n\nVi que você ainda não começou a configurar seu CRM. Que tal dar o primeiro passo agora? Leva só alguns minutinhos: conecte seu WhatsApp, convide sua equipe ou personalize seu funil de vendas.\n\nQualquer dúvida, é só responder aqui! 🚀",
  TRIAL_D1_PRIMEIRA_OPORTUNIDADE:
    "Olá, {{name}}! 👋\n\nQue tal cadastrar sua primeira oportunidade no CRM? É o jeito mais rápido de ver a IA trabalhando de verdade: acompanhando a conversa, movendo o card pelo funil e te avisando na hora certa.\n\nAcesse o Pipeline e crie a primeira agora. 🎯",
  TRIAL_D2_DOR_DEMO1:
    "Olá, {{name}}! 👋\n\nQuantas oportunidades sua equipe perde hoje por demorar pra responder um lead? Com o CRM, a IA responde na hora, todo santo dia, sem folga.\n\nQue tal ver isso funcionando na prática? Agende uma demonstração gratuita com um especialista — 20 minutos, sem compromisso. 📅",
  TRIAL_D3_PROVA_SOCIAL:
    "Olá, {{name}}! 👋\n\nEmpresas que usam o CRM da FluxVenda reduzem o tempo de resposta ao cliente em até 70% — a IA cuida do primeiro atendimento enquanto sua equipe foca em fechar negócio.\n\nContinue explorando o CRM, o resultado aparece rápido! 📈",
  TRIAL_D4_CONVIDAR_EQUIPE:
    "Olá, {{name}}! 👋\n\nJá convidou sua equipe pro CRM? Cada atendente pode ter seu próprio acesso, ver só as conversas dele e você acompanha tudo de cima, com metas e relatórios de gestão.\n\nAcesse Equipe e adicione o primeiro membro. 👥",
  TRIAL_D5_VALOR_DEMO2:
    "Olá, {{name}}! 👋\n\nSeu teste grátis está passando rápido! Times que usam o CRM no dia a dia relatam aumento médio de 30% nas vendas fechadas com a ajuda da IA.\n\nAinda dá tempo de agendar uma demonstração gratuita com um especialista e tirar todas as suas dúvidas. 📅",
  TRIAL_D5_POS_DEMO:
    "Olá, {{name}}! 👋\n\nFoi ótimo te mostrar o CRM na demonstração! Ficou alguma dúvida sobre como aplicar no seu negócio? É só responder essa mensagem que a gente te ajuda a tirar o máximo proveito do teste grátis. 🙌",
  TRIAL_D6_AVISO_24H:
    "Olá, {{name}}! 👋\n\nSeu teste grátis do CRM termina em 24 horas! Depois disso, o acesso é bloqueado até você escolher um plano.\n\nGaranta a continuidade agora mesmo, sem perder o que já configurou. 🚀",
  TRIAL_D7_CONVERTER:
    "Olá, {{name}}! 👋\n\nHoje é o último dia do seu teste grátis! Escolha um plano agora e mantenha tudo funcionando sem interrupção: sua equipe, seus pipelines e a IA já treinada.\n\nÉ rápido, acesse a tela de planos e escolha o que faz mais sentido pro seu momento. 💳",
  TRIAL_D8_RECUPERAR_CONTA:
    "Olá, {{name}}! 👋\n\nSeu teste grátis do CRM terminou e sua conta ficou sem plano ativo. Ainda dá tempo de reativar e continuar de onde parou — nada do que você configurou foi perdido.\n\nQuer ajuda pra escolher o plano certo? É só responder essa mensagem. 🙌",
  TRIAL_D10_OBJECAO:
    "Olá, {{name}}! 👋\n\nPercebi que você ainda não voltou a ativar o CRM. Teve alguma dificuldade ou dúvida que te impediu de continuar? Me conta aqui — às vezes um ajuste rápido resolve.\n\nEstamos à disposição pra te ajudar a decidir. 🤝",
  TRIAL_D14_ENCERRAR:
    "Olá, {{name}}! 👋\n\nEssa é nossa última mensagem por aqui — não queremos ser inconvenientes! Se mudar de ideia, o CRM continua disponível pra você quando quiser voltar.\n\nFoi um prazer te acompanhar nesses dias. Sucesso nas vendas! 🚀",
};

// Reaproveita o checklist do Hub como proxy de "ainda não voltou a mexer no CRM" — não existe
// rastreio de login/acesso no banco hoje, e esse é o sinal mais próximo disso já disponível.
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

async function hasOpportunity(teamId: string): Promise<boolean> {
  const configs = await prisma.agentConfig.findMany({ where: { teamId }, select: { id: true } });
  if (configs.length === 0) return false;
  const opp = await prisma.opportunity.findFirst({
    where: { conversation: { agentConfigId: { in: configs.map(c => c.id) } } },
  });
  return Boolean(opp);
}

// "realizada" é inferido (não existe status dedicado em DemoBooking) — se a data agendada já
// passou e não foi cancelada, considera que a demonstração aconteceu.
async function getDemoState(teamId: string): Promise<"nenhuma" | "agendada" | "realizada"> {
  const demo = await prisma.demoBooking.findFirst({
    where: { teamId, status: "AGENDADO" },
    orderBy: { scheduledAt: "desc" },
  });
  if (!demo) return "nenhuma";
  return demo.scheduledAt.getTime() < Date.now() ? "realizada" : "agendada";
}

async function jaProcessado(teamId: string, stepId: string): Promise<boolean> {
  const row = await prisma.trialFunnelSent.findUnique({ where: { teamId_stepId: { teamId, stepId } } });
  return Boolean(row);
}

async function marcarProcessado(teamId: string, stepId: string): Promise<void> {
  await prisma.trialFunnelSent.create({ data: { teamId, stepId } });
}

async function disparar(stepId: string, phone: string, name: string): Promise<boolean> {
  const message = await renderMessageTemplate(stepId, { name }, FALLBACKS[stepId]);
  const sentId = await sendWhatsAppText(phone, message);
  return Boolean(sentId);
}

// Cron do funil de acompanhamento do teste grátis do CRM (14 dias) — separado do funil de
// boas-vindas/onboarding da plataforma (esse dispara 1x no cadastro; este manda uma
// sequência condicional ao longo do trial e do pós-trial). Disparado externamente com:
// Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Janela de 15 dias cobre até a última etapa (dia 14) com folga — equipes mais antigas que
  // isso não têm mais nenhuma etapa pendente, não precisam ser escaneadas.
  const teams = await prisma.team.findMany({
    where: { crmTrialEndsAt: { not: null }, createdAt: { gte: new Date(Date.now() - 15 * 86_400_000) } },
    select: { id: true, createdAt: true, manager: { select: { name: true, phone: true } } },
  });

  let enviados = 0;
  let pulados = 0;

  for (const team of teams) {
    if (!team.manager.phone) continue;

    // Converteu (comprou um plano de verdade) — para toda a sequência, tanto de nutrição
    // quanto de recuperação pós-trial.
    const converteu = await prisma.planPurchase.findFirst({ where: { teamId: team.id, status: "PAGO" } });
    if (converteu) continue;

    const elapsedHours = (Date.now() - team.createdAt.getTime()) / 3_600_000;

    for (const step of TRIAL_FUNNEL_STEPS) {
      if (step.id === "TRIAL_D5_POS_DEMO") continue; // tratado junto com TRIAL_D5_VALOR_DEMO2
      if (elapsedHours < step.anchorHours) continue;
      if (await jaProcessado(team.id, step.id)) continue;

      if (step.id === "TRIAL_D5_VALOR_DEMO2") {
        const demoState = await getDemoState(team.id);
        if (demoState === "agendada") {
          // Já agendou pelo 1º convite — o 2º não é enviado.
          await marcarProcessado(team.id, step.id);
          pulados++;
          continue;
        }
        const stepIdReal = demoState === "realizada" ? "TRIAL_D5_POS_DEMO" : "TRIAL_D5_VALOR_DEMO2";
        try {
          const ok = await disparar(stepIdReal, team.manager.phone, team.manager.name);
          if (!ok) throw new Error("Instância de WhatsApp não confirmou o envio");
          await marcarProcessado(team.id, step.id);
          await marcarProcessado(team.id, stepIdReal);
          enviados++;
        } catch (err) {
          console.error(`[cron/trial-funil] erro na etapa ${stepIdReal} da equipe ${team.id}:`, err);
        }
        continue;
      }

      let podeEnviar = true;
      if (step.id === "TRIAL_D_2H_RECUPERAR") podeEnviar = await checklistEstaVazio(team.id);
      else if (step.id === "TRIAL_D1_PRIMEIRA_OPORTUNIDADE") podeEnviar = !(await hasOpportunity(team.id));
      else if (step.id === "TRIAL_D4_CONVIDAR_EQUIPE") podeEnviar = (await prisma.teamMember.count({ where: { teamId: team.id } })) === 0;

      if (!podeEnviar) {
        await marcarProcessado(team.id, step.id);
        pulados++;
        continue;
      }

      try {
        const ok = await disparar(step.id, team.manager.phone, team.manager.name);
        if (!ok) throw new Error("Instância de WhatsApp não confirmou o envio");
        await marcarProcessado(team.id, step.id);
        enviados++;
      } catch (err) {
        console.error(`[cron/trial-funil] erro na etapa ${step.id} da equipe ${team.id}:`, err);
      }
    }
  }

  return NextResponse.json({ teams: teams.length, enviados, pulados });
}
