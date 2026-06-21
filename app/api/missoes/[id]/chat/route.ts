import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openai, MODEL } from "@/lib/openai";
import { levelFromXP } from "@/lib/utils";

const AREA_LABELS: Record<string, string> = {
  leads: "Geração de Leads", process: "Processo de Vendas", team: "Negociação & Objeções",
  kpis: "KPIs & Dados", tools: "Ferramentas & CRM", value: "Proposta de Valor",
  retention: "Retenção de Clientes", money: "Dinheiro na Mesa",
};

const CHALLENGE_PROMPTS: Record<string, string> = {
  leads: `Guie o usuário a definir o Perfil de Cliente Ideal (ICP) da empresa e identificar os 3 principais canais de geração de leads.
Roteiro: comece perguntando quem é o comprador típico (cargo, tamanho de empresa). Depois explore: qual dor principal a solução resolve? Como esse cliente decide a compra?
Com as respostas, monte um ICP em 3 bullets e sugira os 3 canais mais eficazes para esse perfil com uma ação concreta em cada.`,

  process: `Ajude o usuário a mapear o processo de vendas atual e identificar onde os negócios morrem.
Roteiro: pergunte quais etapas existem hoje (do primeiro contato ao fechamento). Onde os deals travam mais? Qual etapa tem maior queda?
Depois sugira um funil melhorado com critérios claros de avanço entre etapas e 2 ações para implementar essa semana.`,

  team: `Simule ser um prospect difícil do segmento para treinar negociação e objeções.
Apresente-se como potencial cliente e lance uma objeção realista de preço: "Achei caro, estou vendo outras opções."
Avalie a resposta e dê feedback direto. Faça isso por 3 rodadas com objeções diferentes (preço, timing, concorrente).
Ao final, dê um score de 0-100 para a performance e 3 dicas práticas de melhoria.`,

  kpis: `Ajude o usuário a definir os 5 KPIs comerciais mais importantes com metas realistas.
Roteiro: pergunte o que é medido hoje e qual a maior dificuldade com dados (não ter, não entender, ou não agir com base neles).
Com base no segmento, sugira 5 KPIs essenciais com explicação do que cada um mede, por que importa, e uma meta realista para 90 dias.`,

  tools: `Crie junto com o usuário um plano de 30 dias para implementar ou melhorar o uso do CRM.
Roteiro: qual ferramenta usa hoje? Qual o maior problema? A equipe registra interações?
Gere um plano em 4 semanas: configuração, treinamento, adoção e revisão. Finalize com as 3 funcionalidades do CRM para usar primeiro.`,

  value: `Construa junto com o usuário um pitch de proposta de valor poderoso.
Roteiro: para quem vende e qual problema resolve? Qual resultado concreto o cliente tem? O que é diferente da concorrência?
Monte um pitch com a estrutura: "Para [cliente], que enfrenta [problema], entregamos [resultado]. Diferente de [concorrente], nós [diferencial]."
Revise até ficar claro e peça que o usuário teste em voz alta.`,

  retention: `Crie uma estratégia de retenção de clientes com ações para essa semana.
Roteiro: qual a taxa de churn estimada? Quando foi o último contato proativo com clientes? Você mede satisfação?
Com as respostas, crie: critérios para identificar clientes em risco, uma régua de relacionamento proativo, e uma oferta de renovação.
Finalize com 5 clientes que o usuário deve contactar esta semana.`,

  money: `Identifique as 3 maiores oportunidades de receita não capturada na base atual.
Roteiro: você tem clientes que nunca expandiram o contrato? Tem processo de upsell? Os clientes indicam? Você dá desconto com frequência?
Para cada oportunidade identificada, crie uma ação concreta e um roteiro de abordagem para essa semana.`,
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { messages } = (await req.json()) as { messages: { role: string; content: string }[] };

  const [userMission, profile] = await Promise.all([
    prisma.userMission.findFirst({
      where: { id, profileId: userId },
      include: { mission: true },
    }),
    prisma.profile.findUnique({ where: { id: userId }, select: { segment: true, name: true } }),
  ]);

  if (!userMission) return NextResponse.json({ error: "Missão não encontrada" }, { status: 404 });
  if (userMission.completed) return NextResponse.json({ error: "Missão já concluída" }, { status: 400 });

  let condition: Record<string, unknown> = {};
  try { condition = JSON.parse(userMission.mission.condition); } catch {}

  const area = condition.area as string;
  const score = condition.score as number;
  const priority = condition.priority as string;
  const diagnosticType = condition.diagnosticType as string;
  const segment = profile?.segment ?? "B2B";
  const areaLabel = AREA_LABELS[area] ?? area;
  const challengeGuide = CHALLENGE_PROMPTS[area] ?? "Ajude o usuário a melhorar esta área com perguntas práticas.";
  const exchangeCount = messages.filter((m) => m.role === "user").length;

  const systemPrompt = `Você é um consultor sênior de vendas B2B com 20 anos de experiência, especialista no segmento "${segment}".

CONTEXTO DO USUÁRIO:
- Tipo: ${diagnosticType === "EMPRESA" ? "Gestor/Empresário" : "Vendedor"}
- Segmento: ${segment}
- Problema identificado: área de "${areaLabel}" com score ${score}/100 (${priority})

SEU PAPEL NESTE DESAFIO:
${challengeGuide}

REGRAS DE CONDUÇÃO:
- Faça UMA pergunta por vez. Nunca sobrecarregue com múltiplas perguntas.
- Seja direto e prático. Nada de teoria. Use exemplos reais do segmento "${segment}".
- Construa sobre as respostas anteriores — referencie o que o usuário já disse.
- O exercício precisa de profundidade real. Só marque como concluído após pelo menos 4 trocas e quando um entregável concreto tiver sido criado (ICP, plano, pitch, lista, etc).
${exchangeCount < 4 ? "- Ainda nas primeiras trocas. Continue guiando. NÃO marque como concluído ainda." : "- Você pode marcar como concluído se o exercício gerou um entregável concreto e o usuário demonstrou entendimento."}

CONCLUSÃO:
Quando o exercício estiver verdadeiramente completo, adicione ao FINAL da resposta (fora do texto normal, sem markdown):
{"completed":true,"summary":"entregável criado em 1 frase","feedback":"feedback motivacional + próximo passo"}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  // Detecta conclusão no JSON inline
  const jsonMatch = raw.match(/\{"completed":true[^}]*\}/);
  let completed = false;
  let summary = "";
  let feedback = "";

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.completed === true) {
        completed = true;
        summary = parsed.summary ?? "";
        feedback = parsed.feedback ?? "";
      }
    } catch {}
  }

  const reply = raw.replace(/\{"completed":true[^}]*\}/, "").trim();

  if (completed) {
    const xpReward = userMission.mission.xpReward;
    await prisma.userMission.update({
      where: { id },
      data: { completed: true, completedAt: new Date(), progress: 100 },
    });
    const [, updatedProfile] = await prisma.$transaction([
      prisma.xPTransaction.create({
        data: {
          profileId: userId,
          amount: xpReward,
          reason: `Desafio IA concluído: ${areaLabel}`,
          source: "MISSION_COMPLETE",
        },
      }),
      prisma.profile.update({ where: { id: userId }, data: { xp: { increment: xpReward } } }),
    ]);
    const newLevel = levelFromXP(updatedProfile.xp);
    if (newLevel > updatedProfile.level) {
      await prisma.profile.update({ where: { id: userId }, data: { level: newLevel } });
    }
    return NextResponse.json({ reply, completed: true, summary, feedback, xpGained: xpReward });
  }

  return NextResponse.json({ reply, completed: false });
}
