import "server-only";
import { prisma } from "@/lib/prisma";
import { openai, MODEL } from "@/lib/openai";
import { seedDefaultPipeline, seedDefaultLeadStatuses } from "@/lib/pipeline";
import { randomUUID } from "crypto";

// Cada estágio do funil padrão vira uma oportunidade de exemplo — "Fechado" e "Perdido"
// ganham wonAt/lostAt pra ficar realista quando o admin olhar o pipeline.
function resolveStageOutcome(stageName: string): { wonAt: Date | null; lostAt: Date | null } {
  if (stageName === "Fechado") return { wonAt: new Date(), lostAt: null };
  if (stageName === "Perdido") return { wonAt: null, lostAt: new Date() };
  return { wonAt: null, lostAt: null };
}

type DialogoSimulado = {
  contactName: string;
  messages: { role: "user" | "assistant"; content: string }[];
};

// Gera, via IA, uma conversa de WhatsApp fictícia mas plausível pro segmento/etapa — é só pra
// preencher a conta de exemplo com algo que pareça real numa demonstração comercial, nunca é
// enviada de verdade (a conta de exemplo não tem WhatsApp conectado de verdade).
async function generateDemoDialogue(params: { teamName: string; segmento: string; subsegmento: string; stageName: string }): Promise<DialogoSimulado> {
  const prompt = `Gere uma conversa simulada e realista de WhatsApp entre um lead em potencial e o atendente de IA de uma empresa do segmento "${params.segmento}" (subsegmento "${params.subsegmento}"), chamada "${params.teamName}". O lead está atualmente na etapa "${params.stageName}" do funil de vendas — a conversa deve fazer sentido pra esse momento (ex: "Novo Lead" = primeiro contato/dúvida inicial; "Fechado" = negociação já concluída; "Perdido" = lead desistiu ou escolheu outra opção).

Escreva em português do Brasil, tom natural de WhatsApp (mensagens curtas, sem formalidade excessiva, pode usar 1-2 emojis). Entre 4 e 8 mensagens no total, alternando cliente e atendente, começando pelo cliente.

Responda APENAS com um JSON válido neste formato exato, sem markdown, sem comentários:
{"contactName": "Nome Fictício", "messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 900,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.filter((m: unknown): m is { role: "user" | "assistant"; content: string } =>
          Boolean(m) && typeof m === "object" && ("role" in (m as object)) && ("content" in (m as object))
        )
      : [];
    return { contactName: typeof parsed.contactName === "string" ? parsed.contactName : "Lead Exemplo", messages };
  } catch {
    return { contactName: "Lead Exemplo", messages: [] };
  }
}

function fakePhoneNumber(seed: number): string {
  return `5511900${String(seed).padStart(6, "0")}`;
}

export type DemoAccountOptions = {
  conversasPorEtapa: number; // quantas conversas/oportunidades simuladas por etapa do funil
  valorMin: number; // faixa de dealValue sorteado pra cada oportunidade (R$)
  valorMax: number;
};

export const DEMO_ACCOUNT_DEFAULTS: DemoAccountOptions = { conversasPorEtapa: 1, valorMin: 500, valorMax: 4500 };

// Cria uma conta de exemplo completa: Profile (dono fictício) + Team (isDemo) + AgentConfig
// (sem WhatsApp real conectado — token fixo só pra passar no gate de "canal conectado" das
// telas do CRM, nunca chega a mandar mensagem de verdade) + Pipeline padrão + N conversas
// simuladas por etapa, com diálogo gerado por IA e valor de negociação na faixa escolhida.
// Chamado por app/api/admin/contas-exemplo.
export async function createDemoAccount(segmento: string, subsegmento: string, options: DemoAccountOptions = DEMO_ACCOUNT_DEFAULTS): Promise<{ teamId: string; agentId: string }> {
  const { conversasPorEtapa, valorMin, valorMax } = options;
  const suffix = randomUUID().slice(0, 8);
  const teamName = `Exemplo — ${segmento} (${subsegmento})`;

  const manager = await prisma.profile.create({
    data: {
      email: `demo-${suffix}@fluxvenda-demo.internal`,
      name: `Gestor Exemplo — ${segmento}`,
      role: "GESTOR",
      onboarded: true,
    },
  });

  const team = await prisma.team.create({
    data: {
      managerId: manager.id,
      name: teamName,
      segment: segmento,
      subsegment: subsegmento,
      productsOwned: ["CRM"],
      isDemo: true,
    },
  });

  const agent = await prisma.agentConfig.create({
    data: {
      teamId: team.id,
      nome: "Assistente",
      segmento,
      subsegmento,
      descricaoEmpresa: `${teamName} — conta de exemplo gerada pra demonstração, com pipeline e conversas simuladas.`,
      systemPrompt: `Você é o atendente de IA da ${teamName}, uma empresa fictícia do segmento ${segmento} (${subsegmento}) usada só como exemplo.`,
      active: false,
      // Token fixo (não conecta em nada de verdade) só pra "canal conectado" reconhecer a
      // conta como ativa nas telas do CRM — nenhum envio real é tentado sem interação humana.
      uazapiToken: `demo-${suffix}`,
    },
  });

  const pipeline = await seedDefaultPipeline(agent.id);
  await seedDefaultLeadStatuses(agent.id);
  const stages = await prisma.pipelineStage.findMany({ where: { pipelineId: pipeline.id }, orderBy: { order: "asc" } });

  let seed = Math.floor(Math.random() * 900000);
  let conversaIndex = 0;
  for (const stage of stages) {
    for (let n = 0; n < conversasPorEtapa; n++) {
      seed++;
      conversaIndex++;
      const dialogo = await generateDemoDialogue({ teamName, segmento, subsegmento, stageName: stage.name });
      if (dialogo.messages.length === 0) continue;

      const conversation = await prisma.conversation.create({
        data: {
          agentConfigId: agent.id,
          contactNumber: fakePhoneNumber(seed),
          contactName: dialogo.contactName,
        },
      });

      const baseTime = Date.now() - (stages.length * conversasPorEtapa - conversaIndex) * 3_600_000; // espalha ao longo dos últimos dias
      for (let i = 0; i < dialogo.messages.length; i++) {
        const m = dialogo.messages[i];
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: m.role,
            content: m.content,
            createdAt: new Date(baseTime + i * 4 * 60_000), // ~4 min entre mensagens
          },
        });
      }

      const { wonAt, lostAt } = resolveStageOutcome(stage.name);
      await prisma.opportunity.create({
        data: {
          conversationId: conversation.id,
          stageId: stage.id,
          dealValue: Math.round((valorMin + Math.random() * (valorMax - valorMin)) * 100) / 100,
          wonAt,
          lostAt,
        },
      });
    }
  }

  return { teamId: team.id, agentId: agent.id };
}
