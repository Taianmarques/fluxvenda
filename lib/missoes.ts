import { prisma } from "@/lib/prisma";

type Template = {
  titleCritico: string;
  titleAtencao: string;
  description: string;
  link: string;
  linkLabel: string;
  icon: string;
  xpCritico: number;
  xpAtencao: number;
};

const TEMPLATES_EMPRESA: Record<string, Template> = {
  leads: {
    icon: "🎯", titleCritico: "Estruturar geração de leads", titleAtencao: "Otimizar geração de leads",
    description: "Ative ao menos 3 canais de prospecção, defina o ICP e monitore o custo por lead mensalmente.",
    link: "/trilhas", linkLabel: "Ver trilhas de prospecção", xpCritico: 200, xpAtencao: 100,
  },
  process: {
    icon: "⚙️", titleCritico: "Criar playbook e funil de vendas", titleAtencao: "Revisar processo comercial",
    description: "Documente as etapas do funil, crie critérios de avanço e formalize o playbook da equipe.",
    link: "/playbook", linkLabel: "Acessar playbook", xpCritico: 200, xpAtencao: 100,
  },
  team: {
    icon: "👥", titleCritico: "Estruturar treinamento contínuo da equipe", titleAtencao: "Aprimorar gestão do time",
    description: "Implante programa de treinamentos, metas individuais e reuniões semanais de pipeline.",
    link: "/trilhas", linkLabel: "Ver trilhas de liderança", xpCritico: 200, xpAtencao: 100,
  },
  kpis: {
    icon: "📊", titleCritico: "Criar dashboard de KPIs comerciais", titleAtencao: "Melhorar acompanhamento de dados",
    description: "Defina 5 KPIs essenciais, configure um dashboard e revise o pipeline toda semana.",
    link: "/scanner", linkLabel: "Refazer diagnóstico", xpCritico: 150, xpAtencao: 75,
  },
  tools: {
    icon: "🔧", titleCritico: "Implementar CRM e ferramentas de vendas", titleAtencao: "Melhorar adoção de ferramentas",
    description: "Adote um CRM e treine a equipe para registrar 100% das interações e oportunidades.",
    link: "/trilhas", linkLabel: "Ver trilhas de ferramentas", xpCritico: 150, xpAtencao: 75,
  },
  value: {
    icon: "💎", titleCritico: "Desenvolver proposta de valor clara", titleAtencao: "Fortalecer diferenciação",
    description: "Crie um pitch diferenciado, reúna cases de sucesso e alinhe a comunicação da equipe.",
    link: "/scripts", linkLabel: "Gerar scripts de vendas", xpCritico: 200, xpAtencao: 100,
  },
  retention: {
    icon: "🔄", titleCritico: "Criar processo de retenção de clientes", titleAtencao: "Melhorar Customer Success",
    description: "Estruture onboarding de clientes, meça NPS regularmente e ative renovações proativas.",
    link: "/playbook", linkLabel: "Ver playbook de retenção", xpCritico: 200, xpAtencao: 100,
  },
  money: {
    icon: "💰", titleCritico: "Recuperar receita que está sendo perdida", titleAtencao: "Capturar receita oculta",
    description: "Ative upsell sistematizado, reative clientes inativos e crie programa de indicações com incentivo.",
    link: "/scanner", linkLabel: "Ver diagnóstico completo", xpCritico: 250, xpAtencao: 125,
  },
};

const TEMPLATES_VENDEDOR: Record<string, Template> = {
  leads: {
    icon: "🎯", titleCritico: "Criar rotina de prospecção ativa", titleAtencao: "Intensificar prospecção",
    description: "Defina metas semanais e use pelo menos 3 canais para prospectar novos clientes.",
    link: "/trilhas", linkLabel: "Ver trilhas de prospecção", xpCritico: 150, xpAtencao: 75,
  },
  process: {
    icon: "🔍", titleCritico: "Aplicar qualificação em todas as reuniões", titleAtencao: "Melhorar qualificação",
    description: "Use framework BANT ou SPIN para qualificar budget, urgência e decisor em cada reunião.",
    link: "/trilhas", linkLabel: "Ver trilhas de qualificação", xpCritico: 150, xpAtencao: 75,
  },
  value: {
    icon: "💎", titleCritico: "Criar e praticar seu pitch de valor", titleAtencao: "Aprimorar apresentações",
    description: "Desenvolva um pitch de 2 minutos com cases de sucesso e pratique até dominar.",
    link: "/scripts", linkLabel: "Gerar meu script", xpCritico: 150, xpAtencao: 75,
  },
  team: {
    icon: "🥊", titleCritico: "Dominar respostas às objeções do segmento", titleAtencao: "Melhorar negociação",
    description: "Treine as 5 principais objeções do seu segmento até respondê-las com naturalidade.",
    link: "/objecoes", linkLabel: "Treinar objeções agora", xpCritico: 150, xpAtencao: 75,
  },
  kpis: {
    icon: "🏁", titleCritico: "Estruturar follow-up e fechamento", titleAtencao: "Melhorar taxa de fechamento",
    description: "Defina próximos passos concretos em 100% das reuniões e mantenha pipeline atualizado.",
    link: "/trilhas", linkLabel: "Ver trilhas de fechamento", xpCritico: 150, xpAtencao: 75,
  },
  tools: {
    icon: "🔧", titleCritico: "Adotar ferramentas de produtividade", titleAtencao: "Melhorar uso das ferramentas",
    description: "Registre 100% das interações no CRM e monitore suas métricas individuais semanalmente.",
    link: "/trilhas", linkLabel: "Ver trilhas", xpCritico: 100, xpAtencao: 50,
  },
  retention: {
    icon: "📈", titleCritico: "Investir em desenvolvimento contínuo", titleAtencao: "Acelerar seu desenvolvimento",
    description: "Conclua ao menos 1 trilha de vendas por mês e peça feedback dos clientes regularmente.",
    link: "/trilhas", linkLabel: "Ver trilhas disponíveis", xpCritico: 150, xpAtencao: 75,
  },
};

export async function generateMissionsFromDiagnostic(
  profileId: string,
  diagnosticId: string,
  diagnosticType: "EMPRESA" | "VENDEDOR",
  areaScores: Record<string, number>,
) {
  const templates = diagnosticType === "EMPRESA" ? TEMPLATES_EMPRESA : TEMPLATES_VENDEDOR;

  // Remove missões incompletas de diagnósticos ANTERIORES
  const allScannerMissions = await prisma.userMission.findMany({
    where: { profileId, completed: false, mission: { condition: { contains: '"type":"scanner"' } } },
    include: { mission: true },
  });
  const fromOtherDiagnostics = allScannerMissions.filter((um) => {
    try { return JSON.parse(um.mission.condition).diagnosticId !== diagnosticId; } catch { return true; }
  });
  if (fromOtherDiagnostics.length > 0) {
    await prisma.userMission.deleteMany({ where: { id: { in: fromOtherDiagnostics.map((m) => m.id) } } });
    for (const m of fromOtherDiagnostics) {
      const rem = await prisma.userMission.count({ where: { missionId: m.missionId } });
      if (rem === 0) await prisma.mission.delete({ where: { id: m.missionId } }).catch(() => {});
    }
  }

  // Descobre quais áreas já têm missão para este diagnóstico (concluídas ou não)
  const existingForDiagnostic = await prisma.userMission.findMany({
    where: { profileId, mission: { condition: { contains: `"diagnosticId":"${diagnosticId}"` } } },
    include: { mission: true },
  });
  const coveredAreas = new Set(
    existingForDiagnostic.map((um) => {
      try { return JSON.parse(um.mission.condition).area as string; } catch { return ""; }
    }).filter(Boolean),
  );

  // Cria apenas as áreas que ainda não têm missão
  const areasToCreate = Object.entries(areaScores)
    .filter(([area, score]) => score < 70 && templates[area] && !coveredAreas.has(area))
    .sort(([, a], [, b]) => a - b);

  for (const [area, score] of areasToCreate) {
    const t = templates[area];
    const priority = score < 40 ? "CRITICO" : "ATENCAO";
    const mission = await prisma.mission.create({
      data: {
        title: `${t.icon} ${priority === "CRITICO" ? t.titleCritico : t.titleAtencao}`,
        description: t.description,
        xpReward: priority === "CRITICO" ? t.xpCritico : t.xpAtencao,
        type: "PERMANENT",
        condition: JSON.stringify({ type: "scanner", area, priority, diagnosticId, diagnosticType, link: t.link, linkLabel: t.linkLabel, score }),
        active: true,
      },
    });
    await prisma.userMission.create({ data: { profileId, missionId: mission.id } });
  }
}
