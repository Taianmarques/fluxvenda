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

// O que a conta de exemplo deve demonstrar de verdade na conversa vitrine — escolhido pelo
// admin na tela de criação (ver ContasExemploAdminClient.tsx). "foto" só faz sentido com
// "produto" marcado junto (é a foto DO produto).
export type ShowcaseToggles = { produto: boolean; foto: boolean; agendamento: boolean; pagamento: boolean };
export const SHOWCASE_DEFAULTS: ShowcaseToggles = { produto: true, foto: true, agendamento: true, pagamento: true };

type ShowcaseBeat = "texto" | "foto_produto" | "agendar" | "pix";
type ShowcaseMensagem = { role: "user" | "assistant"; content: string; beat?: ShowcaseBeat };
type ShowcaseDialogo = {
  contactName: string;
  produto: { nome: string; preco: number } | null;
  mensagens: ShowcaseMensagem[];
};

// Mesma ideia de generateDemoDialogue, mas roteirizada pra passar, nesta ordem, pelos momentos
// marcados em `toggles` que a conta de exemplo precisa ILUSTRAR de verdade (não só descrever em
// texto): a IA mostrando a foto de um produto, confirmando um agendamento e/ou gerando um Pix.
// Os "beats" marcam em qual mensagem do assistente cada coisa acontece — createShowcaseConversation
// usa isso pra inserir a foto/Appointment/Order de verdade no lugar certo da conversa. Sem
// nenhum toggle ativo não há o que mostrar, então retorna null (a conta fica só com as
// conversas genéricas por etapa).
async function generateShowcaseDialogue(params: {
  teamName: string; segmento: string; subsegmento: string; valorMin: number; valorMax: number; toggles: ShowcaseToggles;
}): Promise<ShowcaseDialogo | null> {
  const { produto, foto, agendamento, pagamento } = params.toggles;
  if (!produto && !agendamento && !pagamento) return null;

  const passos: string[] = [];
  if (produto) passos.push(foto ? "perguntando sobre um produto/serviço específico e pedindo pra ver uma foto" : "perguntando sobre um produto/serviço específico e decidindo com base no que o atendente descreveu");
  if (agendamento) passos.push("decidindo agendar um horário (visita, retirada ou atendimento) e recebendo a confirmação");
  if (pagamento) passos.push("fechando a compra e recebendo um Pix pra pagar, confirmando ao final que vai pagar");
  const passosTexto = passos.map((p, i) => `${i + 1}) ${p}`).join(", ");

  const beats = [
    produto && foto ? `- "foto_produto": a mensagem em que ele avisa que vai mandar a foto (a foto é enviada automaticamente logo depois — não descreva a foto em texto, nem invente um link de imagem)` : null,
    agendamento ? `- "agendar": a mensagem em que ele confirma um horário marcado` : null,
    pagamento ? `- "pix": a mensagem em que ele confirma que gerou a cobrança (o código Pix é enviado automaticamente ANTES dessa mensagem, como uma mensagem separada — não escreva o código Pix você mesmo)` : null,
  ].filter(Boolean).join("\n");

  const prompt = `Gere uma conversa simulada e realista de WhatsApp entre um lead e o atendente de IA de uma empresa do segmento "${params.segmento}" (subsegmento "${params.subsegmento}"), chamada "${params.teamName}"${produto || pagamento ? ", que vende pelo WhatsApp" : ""}${agendamento ? " e agenda horários" : ""}.

A conversa precisa mostrar, NESTA ORDEM, o lead: ${passosTexto}.

Escreva em português do Brasil, tom natural de WhatsApp, mensagens curtas. Entre ${4 + passos.length * 2} e ${6 + passos.length * 3} mensagens no total, alternando cliente e atendente, começando pelo cliente.

${produto || pagamento ? `Invente um produto ou serviço plausível pro segmento, com preço em reais entre ${params.valorMin} e ${params.valorMax}. O nome do produto deve ser curto (até uns 30 caracteres).` : ""}

Marque cada mensagem do ASSISTENTE com um campo "beat":
${beats}
- "texto": qualquer outra mensagem do assistente
Mensagens do cliente (role "user") não precisam de "beat".

Responda APENAS com um JSON válido neste formato exato, sem markdown, sem comentários:
{"contactName": "Nome Fictício"${produto || pagamento ? `, "produto": {"nome": "...", "preco": 000.00}` : ""}, "mensagens": [{"role": "user", "content": "..."}, {"role": "assistant", "beat": "texto", "content": "..."}]}`;

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
    if (mensagens.length === 0) return null;
    const precisaProduto = produto || pagamento;
    if (precisaProduto && !parsed.produto?.nome) return null;
    return {
      contactName: typeof parsed.contactName === "string" ? parsed.contactName : "Cliente Demonstração",
      produto: precisaProduto
        ? {
            nome: String(parsed.produto.nome).slice(0, 60),
            preco: Number(parsed.produto.preco) > 0 ? Number(parsed.produto.preco) : Math.round((params.valorMin + params.valorMax) / 2),
          }
        : null,
      mensagens,
    };
  } catch {
    return null;
  }
}

// Conversa de exemplo pra uma situação específica descrita livremente pelo gestor (ex: "cliente
// que manda mensagem às 3 da manhã") — mesmo formato de generateDemoDialogue, mas o cenário
// substitui a etapa do funil como contexto. Não gera Opportunity/pipeline: é só pra mostrar como
// a IA se comporta nessa situação, sem forçar a conversa a caber numa etapa de vendas.
async function generateCenarioDialogue(params: { teamName: string; segmento: string; subsegmento: string; cenario: string }): Promise<DialogoSimulado> {
  const prompt = `Gere uma conversa simulada e realista de WhatsApp entre um lead e o atendente de IA de uma empresa do segmento "${params.segmento}" (subsegmento "${params.subsegmento}"), chamada "${params.teamName}".

A conversa deve retratar especificamente esta situação, descrita pelo gestor da empresa: "${params.cenario}". Monte uma conversa plausível pra esse cenário exato, mostrando como o atendente de IA lida com ela.

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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Dia (seg-sex) a partir de hoje + offsetDays corridos — offset negativo pra história recente
// (agendamentos já CONCLUIDO), positivo pra agenda futura. Simples: se cair em fim de semana,
// empurra pra segunda — suficiente pra popular uma agenda de demonstração plausível.
function businessDayWithOffset(offsetDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

const FAKE_CONTACT_NAMES = [
  "Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Alves", "Elaine Costa", "Fábio Rocha",
  "Gabriela Dias", "Henrique Nunes", "Isabela Ramos", "João Pedro Silva", "Karina Farias",
  "Lucas Teixeira", "Marina Castro", "Nathan Oliveira", "Paula Barros", "Rafael Gomes",
  "Sabrina Martins", "Thiago Carvalho", "Vanessa Pires", "Wesley Santos",
];

// ─── Agenda cheia pra segmentos que giram em torno de horário marcado ────────

// Subsegmentos (dentro de segmentos que também têm modelos não-agendados, como "Serviços" e
// "Automotivo e Veículos") cujo negócio é, na prática, sempre por agendamento — clínica,
// barbearia/salão/estética entram em "Saúde / Bem-estar", oficina/funilaria em Automotivo.
const SCHEDULING_SUBSEGMENTS = new Set([
  "Saúde / Bem-estar",
  "Oficina Mecânica", "Funilaria e Pintura", "Estética Automotiva",
]);

// "Saúde" como segmento inteiro é sempre por agendamento (consulta, exame, sessão); os demais
// segmentos só entram por subsegmento específico (ver SCHEDULING_SUBSEGMENTS acima).
function isSchedulingFocused(segmento: string, subsegmento: string): boolean {
  return segmento === "Saúde" || SCHEDULING_SUBSEGMENTS.has(subsegmento);
}

type AgendaEquipe = { profissionais: string[]; servicos: { nome: string; duracaoMinutos: number }[] };

const AGENDA_EQUIPE_FALLBACK: AgendaEquipe = {
  profissionais: ["Atendente 1", "Atendente 2"],
  servicos: [{ nome: "Atendimento", duracaoMinutos: 30 }],
};

// Nomes de profissionais e serviços plausíveis pro segmento — só usado quando
// isSchedulingFocused, pra popular Professional/Service antes de gerar a agenda. Nunca trava a
// criação da conta: qualquer falha da IA cai no fallback genérico acima.
async function generateAgendaEquipe(params: { segmento: string; subsegmento: string }): Promise<AgendaEquipe> {
  const prompt = `Para uma empresa do segmento "${params.segmento}" (subsegmento "${params.subsegmento}") que atende por agendamento de horário (ex: clínica, barbearia, salão, oficina), gere nomes plausíveis de 2 profissionais que atendem e de 3 a 5 serviços que essa empresa oferece, com a duração típica em minutos de cada serviço.

Responda APENAS com um JSON válido neste formato exato, sem markdown, sem comentários:
{"profissionais": ["Nome 1", "Nome 2"], "servicos": [{"nome": "...", "duracaoMinutos": 30}]}`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL, max_tokens: 400, response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

    const profissionais = Array.isArray(parsed.profissionais) && parsed.profissionais.length > 0
      ? parsed.profissionais.map(String).slice(0, 4)
      : AGENDA_EQUIPE_FALLBACK.profissionais;

    const servicosBrutos = Array.isArray(parsed.servicos)
      ? parsed.servicos.filter((s: unknown): s is { nome: string; duracaoMinutos?: number } =>
          Boolean(s) && typeof s === "object" && "nome" in (s as object)
        )
      : [];
    const servicos = servicosBrutos.length > 0
      ? servicosBrutos.map((s: { nome: string; duracaoMinutos?: number }) => ({
          nome: String(s.nome),
          duracaoMinutos: Number(s.duracaoMinutos) > 0 ? Number(s.duracaoMinutos) : 30,
        }))
      : AGENDA_EQUIPE_FALLBACK.servicos;

    return { profissionais, servicos };
  } catch {
    return AGENDA_EQUIPE_FALLBACK;
  }
}

// Cadastra profissionais/serviços e preenche a Agenda com um punhado de compromissos espalhados
// entre passado recente (CONCLUIDO) e próximos dias (CONFIRMADO) — só chamado pra segmentos
// onde agendamento é o núcleo do negócio (isSchedulingFocused), pra a tela de Agenda não
// aparecer praticamente vazia numa demonstração desses segmentos. Retorna um profissional e
// serviço "em destaque" pra createShowcaseConversation usar no agendamento da conversa vitrine,
// em vez do modo genérico de agenda única.
async function seedFullAgenda(params: { agentId: string; segmento: string; subsegmento: string }): Promise<{ professionalId: string | null; serviceId: string | null }> {
  const equipe = await generateAgendaEquipe(params);
  const availability = [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, start: "09:00", end: "18:00" }));

  const professionals = await Promise.all(
    equipe.profissionais.map(nome => prisma.professional.create({ data: { agentConfigId: params.agentId, name: nome, availability } }))
  );
  const services = await Promise.all(
    equipe.servicos.map(s => prisma.service.create({ data: { agentConfigId: params.agentId, name: s.nome, durationMinutes: s.duracaoMinutos } }))
  );

  const usedSlots = new Set<string>();
  const totalAppointments = 12 + Math.floor(Math.random() * 5); // 12-16
  for (let i = 0; i < totalAppointments; i++) {
    const scheduledAt = businessDayWithOffset(Math.floor(Math.random() * 13) - 3); // -3 a +9 dias
    scheduledAt.setHours(9 + Math.floor(Math.random() * 9), Math.random() < 0.5 ? 0 : 30, 0, 0);

    const professional = pick(professionals);
    const slotKey = `${professional.id}-${scheduledAt.getTime()}`;
    if (usedSlots.has(slotKey)) continue; // colisão de horário — só pula, não é crítico bater N exato
    usedSlots.add(slotKey);

    const service = pick(services);
    const isPast = scheduledAt.getTime() < Date.now();
    const status = Math.random() < 0.1 ? "CANCELADO" : isPast ? "CONCLUIDO" : "CONFIRMADO";

    await prisma.appointment.create({
      data: {
        agentConfigId: params.agentId,
        professionalId: professional.id,
        serviceId: service.id,
        contactName: pick(FAKE_CONTACT_NAMES),
        contactNumber: fakePhoneNumber(Math.floor(Math.random() * 900000) + 100000),
        scheduledAt,
        durationMinutes: service.durationMinutes,
        status,
      },
    });
  }

  return { professionalId: professionals[0]?.id ?? null, serviceId: services[0]?.id ?? null };
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
  toggles: ShowcaseToggles;
  fotoProduto?: { base64: string; mimeType: string } | null; // foto real enviada pelo admin — sem ela, cai na placeholder gerada
  professionalId?: string | null; serviceId?: string | null;
}): Promise<void> {
  const dialogo = await generateShowcaseDialogue(params);
  if (!dialogo) return;

  // "produto" no catálogo só é criado se o toggle "produto" estiver ligado — quando só
  // "pagamento" está ligado, a cobrança usa o nome/preço do dialogo direto (sem virar item de
  // catálogo, ver OrderItem abaixo, que aceita productId nulo).
  let product: { id: string; name: string; price: number } | null = null;
  let fotoBase64: string | null = null;
  let fotoMime: string | null = null;
  if (params.toggles.produto && dialogo.produto) {
    if (params.toggles.foto) {
      const foto = params.fotoProduto ?? await generateProductPlaceholderImage(dialogo.produto.nome);
      fotoBase64 = foto.base64;
      fotoMime = foto.mimeType;
    }
    product = await prisma.product.create({
      data: {
        agentConfigId: params.agentId,
        name: dialogo.produto.nome,
        price: dialogo.produto.preco,
        imagemBase64: fotoBase64,
        imagemMimeType: fotoMime,
      },
    });
  }

  const contactNumber = fakePhoneNumber(Math.floor(Math.random() * 900000) + 900000);
  const conversation = await prisma.conversation.create({
    data: { agentConfigId: params.agentId, contactNumber, contactName: dialogo.contactName },
  });

  let t = Date.now() - 24 * 60_000; // conversa "recente" (últimos ~24min+)
  const nextTimestamp = () => { t += 2 * 60_000; return new Date(t); };

  for (const m of dialogo.mensagens) {
    // O código Pix chega como mensagem separada ANTES da confirmação — mesma ordem do fluxo real
    if (m.role === "assistant" && m.beat === "pix" && dialogo.produto) {
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
        data: { orderId: order.id, productId: product?.id ?? null, name: dialogo.produto.nome, unitPrice: dialogo.produto.preco, quantity: 1 },
      });
    }

    await prisma.message.create({
      data: { conversationId: conversation.id, role: m.role, content: m.content, createdAt: nextTimestamp() },
    });

    if (m.role === "assistant" && m.beat === "foto_produto" && product && fotoBase64 && fotoMime) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id, role: "assistant", content: product.name,
          mediaUrl: `data:${fotoMime};base64,${fotoBase64}`, mediaType: "image",
          createdAt: nextTimestamp(),
        },
      });
    }

    if (m.role === "assistant" && m.beat === "agendar") {
      // Quando o segmento é focado em agendamento (ver isSchedulingFocused), usa o profissional
      // e serviço já cadastrados por seedFullAgenda — senão cai no modo agenda única do agente.
      const service = params.serviceId
        ? await prisma.service.findUnique({ where: { id: params.serviceId }, select: { durationMinutes: true } })
        : null;
      await prisma.appointment.create({
        data: {
          agentConfigId: params.agentId, conversationId: conversation.id,
          professionalId: params.professionalId ?? null, serviceId: params.serviceId ?? null,
          contactName: dialogo.contactName, contactNumber,
          scheduledAt: nextBusinessDayAt(15), durationMinutes: service?.durationMinutes ?? 30, status: "CONFIRMADO",
        },
      });
    }
  }

  const fechadoStage = params.stages.find(s => s.name === "Fechado") ?? params.stages[params.stages.length - 1];
  if (fechadoStage) {
    await prisma.opportunity.create({
      data: {
        conversationId: conversation.id, stageId: fechadoStage.id,
        title: dialogo.produto?.nome ?? "Atendimento",
        dealValue: dialogo.produto?.preco ?? Math.round((params.valorMin + Math.random() * (params.valorMax - params.valorMin)) * 100) / 100,
        wonAt: new Date(),
      },
    });
  }
}

// Cria uma conversa simples pra um cenário livre descrito pelo gestor (ex: "cliente que manda
// mensagem às 3 da manhã") — sem Opportunity/pipeline, é só pra ilustrar o comportamento da IA
// nessa situação (ver generateCenarioDialogue). Nunca derruba a criação da conta se falhar.
async function createCenarioConversation(params: { agentId: string; teamName: string; segmento: string; subsegmento: string; cenario: string }): Promise<void> {
  const dialogo = await generateCenarioDialogue(params);
  if (dialogo.messages.length === 0) return;

  const conversation = await prisma.conversation.create({
    data: {
      agentConfigId: params.agentId,
      contactNumber: fakePhoneNumber(Math.floor(Math.random() * 900000) + 100000),
      contactName: dialogo.contactName,
    },
  });

  const baseTime = Date.now() - 30 * 60_000;
  for (let i = 0; i < dialogo.messages.length; i++) {
    const m = dialogo.messages[i];
    await prisma.message.create({
      data: { conversationId: conversation.id, role: m.role, content: m.content, createdAt: new Date(baseTime + i * 4 * 60_000) },
    });
  }
}

export type DemoAccountOptions = {
  conversasPorEtapa: number; // quantas conversas/oportunidades simuladas por etapa do funil
  valorMin: number; // faixa de dealValue sorteado pra cada oportunidade (R$)
  valorMax: number;
  showcase: ShowcaseToggles; // o que demonstrar na conversa vitrine — ver generateShowcaseDialogue
  fotoProduto?: { base64: string; mimeType: string } | null; // foto real do produto, enviada pelo admin (opcional — sem ela, usa a placeholder gerada)
  cenariosExtras?: string[]; // situações livres descritas pelo admin, cada uma vira uma conversa própria
};

export const DEMO_ACCOUNT_DEFAULTS: DemoAccountOptions = {
  conversasPorEtapa: 1, valorMin: 500, valorMax: 4500,
  showcase: SHOWCASE_DEFAULTS, fotoProduto: null, cenariosExtras: [],
};

// Cria uma conta de exemplo completa: Profile (dono fictício) + Team (isDemo) + AgentConfig
// (sem WhatsApp real conectado — token fixo só pra passar no gate de "canal conectado" das
// telas do CRM, nunca chega a mandar mensagem de verdade) + Pipeline padrão + N conversas
// simuladas por etapa, com diálogo gerado por IA e valor de negociação na faixa escolhida.
// Também cria uma conversa "vitrine" com catálogo/agendamento ativos, pra demonstrar a IA
// enviando foto de produto, confirmando agendamento e gerando Pix (ver createShowcaseConversation).
// Chamado por app/api/admin/contas-exemplo.
export async function createDemoAccount(segmento: string, subsegmento: string, options: DemoAccountOptions = DEMO_ACCOUNT_DEFAULTS): Promise<{ teamId: string; agentId: string }> {
  const { conversasPorEtapa, valorMin, valorMax, fotoProduto, cenariosExtras = [] } = options;
  const toggles = options.showcase ?? SHOWCASE_DEFAULTS;
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
      // Comércio + agendamento ligados conforme os toggles escolhidos na criação — só o
      // necessário pra conversa "vitrine" (createShowcaseConversation) mostrar de verdade o que
      // o admin marcou (foto de produto, agendamento, Pix).
      commerceEnabled: toggles.produto || toggles.pagamento,
      pickupEnabled: true,
      schedulingEnabled: toggles.agendamento,
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

  // Segmentos onde o negócio inteiro gira em torno de horário marcado (clínica, barbearia,
  // oficina...) ganham profissionais/serviços cadastrados e uma agenda com vários compromissos
  // — senão a tela de Agenda fica praticamente vazia numa demonstração desses segmentos.
  let featuredProfessionalId: string | null = null;
  let featuredServiceId: string | null = null;
  if (toggles.agendamento && isSchedulingFocused(segmento, subsegmento)) {
    const featured = await seedFullAgenda({ agentId: agent.id, segmento, subsegmento });
    featuredProfessionalId = featured.professionalId;
    featuredServiceId = featured.serviceId;
  }

  await createShowcaseConversation({
    agentId: agent.id, stages, teamName, segmento, subsegmento, valorMin, valorMax,
    toggles, fotoProduto,
    professionalId: featuredProfessionalId, serviceId: featuredServiceId,
  });

  // Situações extras descritas livremente pelo admin (ex: "cliente que manda mensagem às 3 da
  // manhã") — cada uma vira uma conversa própria, sem entrar no funil (ver createCenarioConversation).
  for (const cenario of cenariosExtras.map(c => c.trim()).filter(Boolean).slice(0, 5)) {
    await createCenarioConversation({ agentId: agent.id, teamName, segmento, subsegmento, cenario });
  }

  return { teamId: team.id, agentId: agent.id };
}
