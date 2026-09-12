import "server-only";
import sharp from "sharp";
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

// ─── Conversa de vitrine (catálogo + agendamento + Pix) ──────────────────────

type ShowcaseBeat = "texto" | "foto_produto" | "agendar" | "pix";
type ShowcaseMensagem = { role: "user" | "assistant"; content: string; beat?: ShowcaseBeat };
type ShowcaseDialogo = {
  contactName: string;
  produto: { nome: string; preco: number };
  mensagens: ShowcaseMensagem[];
};

// Mesma ideia de generateDemoDialogue, mas roteirizada pra passar, nesta ordem, pelos três
// momentos que a conta de exemplo precisa ILUSTRAR de verdade (não só descrever em texto):
// a IA mostrando a foto de um produto, confirmando um agendamento e gerando um Pix. Os "beats"
// marcam em qual mensagem do assistente cada coisa acontece — createShowcaseConversation usa
// isso pra inserir a foto/Appointment/Order de verdade no lugar certo da conversa.
async function generateShowcaseDialogue(params: {
  teamName: string; segmento: string; subsegmento: string; valorMin: number; valorMax: number;
}): Promise<ShowcaseDialogo | null> {
  const prompt = `Gere uma conversa simulada e realista de WhatsApp entre um lead e o atendente de IA de uma empresa do segmento "${params.segmento}" (subsegmento "${params.subsegmento}"), chamada "${params.teamName}", que vende pelo WhatsApp com catálogo de produtos e agendamento de horários.

A conversa precisa mostrar, NESTA ORDEM, o lead: 1) perguntando sobre um produto/serviço específico e pedindo pra ver uma foto, 2) decidindo agendar um horário (visita, retirada ou atendimento) e recebendo a confirmação, 3) fechando a compra e recebendo um Pix pra pagar. Termine com o cliente confirmando que vai pagar.

Escreva em português do Brasil, tom natural de WhatsApp, mensagens curtas. Entre 8 e 14 mensagens no total, alternando cliente e atendente, começando pelo cliente.

Marque cada mensagem do ASSISTENTE com um campo "beat":
- "foto_produto": a mensagem em que ele avisa que vai mandar a foto (a foto é enviada automaticamente logo depois — não descreva a foto em texto, nem invente um link de imagem)
- "agendar": a mensagem em que ele confirma um horário marcado
- "pix": a mensagem em que ele confirma que gerou a cobrança (o código Pix é enviado automaticamente ANTES dessa mensagem, como uma mensagem separada — não escreva o código Pix você mesmo)
- "texto": qualquer outra mensagem do assistente
Mensagens do cliente (role "user") não precisam de "beat".

Invente um produto ou serviço plausível pro segmento, com preço em reais entre ${params.valorMin} e ${params.valorMax}. O nome do produto deve ser curto (até uns 30 caracteres).

Responda APENAS com um JSON válido neste formato exato, sem markdown, sem comentários:
{"contactName": "Nome Fictício", "produto": {"nome": "...", "preco": 000.00}, "mensagens": [{"role": "user", "content": "..."}, {"role": "assistant", "beat": "texto", "content": "..."}]}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 1400,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const mensagens = Array.isArray(parsed.mensagens)
      ? parsed.mensagens.filter((m: unknown): m is ShowcaseMensagem =>
          Boolean(m) && typeof m === "object" && "role" in (m as object) && "content" in (m as object)
        )
      : [];
    if (mensagens.length === 0 || !parsed.produto?.nome) return null;
    return {
      contactName: typeof parsed.contactName === "string" ? parsed.contactName : "Cliente Demonstração",
      produto: {
        nome: String(parsed.produto.nome).slice(0, 60),
        preco: Number(parsed.produto.preco) > 0 ? Number(parsed.produto.preco) : Math.round((params.valorMin + params.valorMax) / 2),
      },
      mensagens,
    };
  } catch {
    return null;
  }
}

// "Foto" de produto ilustrativa (a conta de exemplo nunca teve uma foto real enviada por um
// cliente) — cartão simples com o nome do produto, gerado via sharp a partir de um SVG, sem
// depender de nenhum asset externo.
async function generateProductPlaceholderImage(nome: string): Promise<{ base64: string; mimeType: string }> {
  const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const label = nome.length > 28 ? `${nome.slice(0, 27)}…` : nome;
  const svg = `
    <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1d4ed8"/>
          <stop offset="100%" stop-color="#1e3a8a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="400" cy="330" r="130" fill="rgba(255,255,255,0.12)"/>
      <text x="400" y="365" font-family="Arial, sans-serif" font-size="90" fill="white" text-anchor="middle">&#128230;</text>
      <text x="400" y="520" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(label)}</text>
      <text x="400" y="570" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.7)" text-anchor="middle">Foto ilustrativa</text>
    </svg>`;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return { base64: buffer.toString("base64"), mimeType: "image/png" };
}

// String no formato de um Pix "copia e cola" (EMV) real, mas com dados fictícios — nunca passa
// por nenhum PSP de verdade, só ilustra visualmente o que o cliente recebe no WhatsApp.
function buildFakePixPayload(valor: number): string {
  const txid = randomUUID().replace(/-/g, "").slice(0, 25).toUpperCase();
  return `00020126580014BR.GOV.BCB.PIX0136${randomUUID()}5204000053039865406${valor.toFixed(2)}5802BR5913FLUXVENDA DEMO6009SAO PAULO62${String(txid.length + 4).padStart(2, "0")}05${txid}6304DEMO`;
}

// Próximo dia útil (seg-sex) num horário fixo — só pra ter uma data plausível no agendamento
// de exemplo (instrumentation.ts já fixa o fuso do processo em America/Sao_Paulo).
function nextBusinessDayAt(hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function fakePhoneNumber(seed: number): string {
  return `5511900${String(seed).padStart(6, "0")}`;
}

// Cria a conversa "vitrine" da conta de exemplo: um produto real no catálogo (com foto), e uma
// conversa que passa pelos três comportamentos que a demonstração comercial precisa mostrar
// funcionando de verdade — não só em texto: a IA manda a foto do produto (Message com
// mediaUrl/mediaType, igual ao enviar_foto_produto real), confirma um agendamento (Appointment
// de verdade, aparece na Agenda) e gera um Pix (Order + código, igual ao gerar_cobranca real).
// Nunca derruba a criação da conta se a IA falhar — sem isso, só faltam esses 3 destaques.
async function createShowcaseConversation(params: {
  agentId: string;
  stages: { id: string; name: string }[];
  teamName: string; segmento: string; subsegmento: string; valorMin: number; valorMax: number;
}): Promise<void> {
  const dialogo = await generateShowcaseDialogue(params);
  if (!dialogo) return;

  const { base64: fotoBase64, mimeType: fotoMime } = await generateProductPlaceholderImage(dialogo.produto.nome);

  const product = await prisma.product.create({
    data: {
      agentConfigId: params.agentId,
      name: dialogo.produto.nome,
      price: dialogo.produto.preco,
      imagemBase64: fotoBase64,
      imagemMimeType: fotoMime,
    },
  });

  const contactNumber = fakePhoneNumber(Math.floor(Math.random() * 900000) + 900000);
  const conversation = await prisma.conversation.create({
    data: { agentConfigId: params.agentId, contactNumber, contactName: dialogo.contactName },
  });

  let t = Date.now() - 24 * 60_000; // conversa "recente" (últimos ~24min+)
  const nextTimestamp = () => { t += 2 * 60_000; return new Date(t); };

  for (const m of dialogo.mensagens) {
    // O código Pix chega como mensagem separada ANTES da confirmação — mesma ordem do fluxo real
    if (m.role === "assistant" && m.beat === "pix") {
      const pixPayload = buildFakePixPayload(dialogo.produto.preco);
      await prisma.message.create({
        data: { conversationId: conversation.id, role: "assistant", content: pixPayload, createdAt: nextTimestamp() },
      });
      const order = await prisma.order.create({
        data: {
          agentConfigId: params.agentId, conversationId: conversation.id,
          contactName: dialogo.contactName, contactNumber,
          status: "AGUARDANDO_PAGAMENTO", total: dialogo.produto.preco,
          asaasPixPayload: pixPayload,
        },
      });
      await prisma.orderItem.create({
        data: { orderId: order.id, productId: product.id, name: product.name, unitPrice: product.price, quantity: 1 },
      });
    }

    await prisma.message.create({
      data: { conversationId: conversation.id, role: m.role, content: m.content, createdAt: nextTimestamp() },
    });

    if (m.role === "assistant" && m.beat === "foto_produto") {
      await prisma.message.create({
        data: {
          conversationId: conversation.id, role: "assistant", content: product.name,
          mediaUrl: `data:${fotoMime};base64,${fotoBase64}`, mediaType: "image",
          createdAt: nextTimestamp(),
        },
      });
    }

    if (m.role === "assistant" && m.beat === "agendar") {
      await prisma.appointment.create({
        data: {
          agentConfigId: params.agentId, conversationId: conversation.id,
          contactName: dialogo.contactName, contactNumber,
          scheduledAt: nextBusinessDayAt(15), durationMinutes: 30, status: "CONFIRMADO",
        },
      });
    }
  }

  const fechadoStage = params.stages.find(s => s.name === "Fechado") ?? params.stages[params.stages.length - 1];
  if (fechadoStage) {
    await prisma.opportunity.create({
      data: {
        conversationId: conversation.id, stageId: fechadoStage.id,
        title: dialogo.produto.nome, dealValue: dialogo.produto.preco, wonAt: new Date(),
      },
    });
  }
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
// Também cria uma conversa "vitrine" com catálogo/agendamento ativos, pra demonstrar a IA
// enviando foto de produto, confirmando agendamento e gerando Pix (ver createShowcaseConversation).
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
      // Comércio + agendamento ativos pra conversa "vitrine" (createShowcaseConversation) poder
      // mostrar a IA enviando foto de produto, confirmando horário e gerando Pix de verdade.
      commerceEnabled: true,
      pickupEnabled: true,
      schedulingEnabled: true,
      availability: [
        { dayOfWeek: 1, start: "09:00", end: "18:00" },
        { dayOfWeek: 2, start: "09:00", end: "18:00" },
        { dayOfWeek: 3, start: "09:00", end: "18:00" },
        { dayOfWeek: 4, start: "09:00", end: "18:00" },
        { dayOfWeek: 5, start: "09:00", end: "18:00" },
      ],
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

  await createShowcaseConversation({ agentId: agent.id, stages, teamName, segmento, subsegmento, valorMin, valorMax });

  return { teamId: team.id, agentId: agent.id };
}
