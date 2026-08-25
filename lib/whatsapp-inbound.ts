// Pipeline compartilhado de atendimento por IA para WhatsApp — extraído de
// app/api/webhooks/whatsapp/route.ts para ser reaproveitado tanto pelo webhook da UazAPI
// quanto pelo webhook da WhatsApp Cloud API (Meta oficial). Cada webhook só faz o parsing
// do payload específico do provedor e chama processIncomingMessage com um adapter de envio.

import { prisma } from "@/lib/prisma";
import {
  runAgent, runAgentWithImage, runAgentWithTools, classifyLeadQualified,
  SCHEDULING_TOOLS, COMMERCE_TOOLS, BILLING_TOOLS, PROSPECTING_TOOLS, POSVENDA_TOOLS, PIPELINE_TOOLS, DEPARTAMENTO_TOOLS,
  PREVENDA_VEICULO_TOOLS,
} from "@/lib/agent-engine";
import { textToSpeech } from "@/lib/elevenlabs";
import { logTokenUsage, isOverQuota } from "@/lib/token-usage";
import { getAvailableSlots, isSlotAvailable, resolveAvailability, busyStatusWhere, formatSlotsForAgent, type AvailabilityRule } from "@/lib/scheduling";
import { assignNextAttendant } from "@/lib/assignment";
import { createAsaasCustomer, createAsaasCharge, cancelAsaasCharge, getAsaasPixQrCode } from "@/lib/asaas";
import { ensureStoreSlug } from "@/lib/store-slug";
import { notifyOrderWebhook } from "@/lib/order-webhook";
import { notifyProfessionalOfAppointment } from "@/lib/appointment-notify";
import { notifyUsers } from "@/lib/onesignal";
import { emitChatEvent } from "@/lib/realtime";

type AgentConfigFull = NonNullable<Awaited<ReturnType<typeof prisma.agentConfig.findFirst>>>;

export type ChannelMediaType = "image" | "video" | "audio" | "document";

// Adapter de envio: cada webhook (UazAPI, Cloud API) fornece sua própria implementação —
// o pipeline abaixo nunca fala diretamente com a UazAPI nem com o Graph API da Meta.
// Retornam o id da mensagem no provedor (quando disponível) pra habilitar citação nativa.
export type ChannelAdapter = {
  sendText: (phone: string, text: string) => Promise<string | null>;
  sendMedia: (phone: string, type: ChannelMediaType, base64: string, opts?: { caption?: string; fileName?: string }) => Promise<string | null>;
};

export type IncomingMessage = {
  text: string;
  caption: string;
  contactNumber: string;
  contactName?: string;
  mediaUrl: string | null;
  mediaType: string | null;
  imageUrl: string | null;
  waMessageId?: string | null;       // id da mensagem no provedor (UazAPI messageid / Cloud wamid)
  quotedWaMessageId?: string | null; // id da mensagem citada, quando o cliente responde citando
  isGroup?: boolean;                 // grupo do WhatsApp — IA nunca responde (ver shouldAiHandle)
  groupSenderName?: string;          // nome de quem mandou dentro do grupo (varia por mensagem)
};

async function buildSchedulingContext(agentConfigId: string, requisitosAgendamento?: string, restricoesAgendamento?: string, atendimentoEspecial?: { enabled: boolean; descricao: string }): Promise<string> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR");
  const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const [services, professionals] = await Promise.all([
    prisma.service.findMany({ where: { agentConfigId, active: true }, select: { name: true } }),
    prisma.professional.findMany({ where: { agentConfigId, active: true }, select: { name: true } }),
  ]);

  const selectionNote = services.length > 0 || professionals.length > 0
    ? `Essa empresa trabalha com ${services.length > 0 ? "serviços específicos" : ""}${services.length > 0 && professionals.length > 0 ? " e " : ""}${professionals.length > 0 ? "profissionais específicos" : ""}. Use listar_servicos_profissionais para saber as opções e pergunte ao cliente qual ele quer ANTES de consultar horários. Depois, passe o nome escolhido nos parâmetros "service"/"professional" das ferramentas de agendamento.`
    : `Essa empresa não trabalha com serviços ou profissionais específicos — não chame listar_servicos_profissionais.`;

  return `\n\nFERRAMENTAS DE AGENDAMENTO:
Hoje é ${dateStr} (${weekday}), agora são ${timeStr}. ${selectionNote}

Quando o cliente quiser agendar algo:
- Pergunte primeiro o dia e período (manhã/tarde/noite) de preferência, se ele não tiver dito.
- Use a ferramenta consultar_horarios_disponiveis para saber os horários reais — nunca invente ou suponha horários livres.
- NUNCA liste todos os horários disponíveis de uma vez. Escolha no máximo 2 ou 3 opções relevantes (próximas ao que o cliente pediu) e ofereça de forma curta e natural, como faria pelo WhatsApp.${requisitosAgendamento ? `
- SÓ DEPOIS que o cliente escolher a data e o horário, envie UMA mensagem pedindo as informações necessárias para confirmar o agendamento: ${requisitosAgendamento}. Não pergunte nada disso antes da escolha do horário.
- Quando o cliente responder com as informações, chame agendar_horario passando tudo no campo "notes". NUNCA confirme o agendamento sem ter coletado essas informações.` : `
- Depois que o cliente escolher um horário, use agendar_horario para confirmar.`}
- Só diga que o agendamento foi confirmado depois que a ferramenta agendar_horario retornar sucesso.${atendimentoEspecial?.enabled ? `\n\nATENDIMENTO ESPECIAL FORA DO HORÁRIO: se o cliente pedir um horário fora da disponibilidade normal e não houver alternativa adequada nos horários disponíveis, informe que é possível verificar um horário especial fora do horário comercial${atendimentoEspecial.descricao ? ` com as seguintes condições: ${atendimentoEspecial.descricao}` : ""}. Deixe claro que esse atendimento especial precisa ser confirmado pela equipe e que você vai registrar o interesse.` : ""}${restricoesAgendamento ? `\n\nRESTRIÇÕES — o que você NÃO deve fazer neste agendamento:\n${restricoesAgendamento}` : ""}

Você também pode receber, no meio da conversa, um lembrete automático perguntando se o cliente confirma presença num agendamento já marcado:
- Se o cliente confirmar (ex: "sim", "confirmado", "pode contar comigo"), apenas agradeça brevemente, sem chamar nenhuma ferramenta.
- Se ele disser que não pode ir ou quer cancelar, use cancelar_agendamento e, na mesma resposta, já ofereça reagendar — pergunte o novo dia/período de preferência (ou, se ele já tiver dito, use consultar_horarios_disponiveis e siga o fluxo normal de agendamento).`;
}

// Web push pro atendente quando chega mensagem numa conversa em atendimento humano —
// a IA não vai responder, então alguém precisa ver. Sem atendente vinculado, avisa
// o gestor e todos os membros da equipe.
async function notifyHumanTakeoverMessage(
  config: AgentConfigFull,
  conversationId: string,
  assignedToId: string | null,
  contato: string,
  texto: string,
): Promise<void> {
  let destinatarios: string[];
  if (assignedToId) {
    destinatarios = [assignedToId];
  } else {
    const team = await prisma.team.findUnique({
      where: { id: config.teamId },
      select: { managerId: true, members: { select: { profileId: true } } },
    });
    if (!team) return;
    destinatarios = [team.managerId, ...team.members.map(m => m.profileId)];
  }
  const preview = texto.length > 120 ? `${texto.slice(0, 120)}...` : texto;
  await notifyUsers(
    destinatarios,
    `Nova mensagem de ${contato}`,
    preview || "Mensagem recebida",
    `${process.env.NEXT_PUBLIC_APP_URL}/crm/${config.id}?c=${conversationId}`,
  );
}

// Modo "agendamento por link": em vez de negociar horários na conversa, a IA envia o link
// da página pública (/agendar), onde o cliente escolhe serviço e horário sozinho. A tool
// cancelar_agendamento continua disponível pra responder aos lembretes de confirmação.
function buildSchedulingLinkContext(bookingUrl: string): string {
  return `\n\nAGENDAMENTO POR LINK:
Essa empresa agenda pela página online. Quando o cliente quiser agendar, marcar horário, remarcar ou saber os horários disponíveis, envie o link abaixo e explique em uma frase que lá ele vê os horários em tempo real e confirma na hora:
${bookingUrl}
- NUNCA proponha, negocie ou confirme horários pela conversa — o agendamento acontece só pelo link.
- Envie o link como texto puro, sem formatação em volta.

Você também pode receber, no meio da conversa, um lembrete automático perguntando se o cliente confirma presença num agendamento já marcado:
- Se o cliente confirmar (ex: "sim", "confirmado"), apenas agradeça brevemente, sem chamar nenhuma ferramenta.
- Se ele disser que não pode ir ou quer cancelar, use cancelar_agendamento e, na mesma resposta, envie o link acima pra ele remarcar.`;
}

// Base de conhecimento do agente — injetada no system prompt de toda resposta (os três
// caminhos: texto com tools, texto puro e imagem). Orçamento de caracteres evita inflar
// o custo de token por mensagem; itens mais antigos têm prioridade (ordem de criação).
async function buildConhecimentoContext(agentConfigId: string): Promise<string> {
  const itens = await prisma.conhecimentoItem.findMany({
    where: { agentConfigId, active: true },
    orderBy: { createdAt: "asc" },
    select: { titulo: true, conteudo: true },
  });
  if (itens.length === 0) return "";

  const BUDGET = 12000;
  let total = 0;
  const blocks: string[] = [];
  for (const item of itens) {
    const block = `--- ${item.titulo} ---\n${item.conteudo}`;
    if (total + block.length > BUDGET) break;
    blocks.push(block);
    total += block.length;
  }
  if (blocks.length === 0) return "";

  return `\n\nBASE DE CONHECIMENTO DA EMPRESA (use estas informações para responder com precisão; se a resposta estiver aqui, prefira ela a inventar):\n${blocks.join("\n")}`;
}

// Lista os departamentos humanos e ensina o agente a transferir quando o assunto exigir
function buildDepartamentosContext(departamentos: { nome: string; descricao: string }[]): string {
  const lista = departamentos
    .map(d => `- ${d.nome}${d.descricao ? `: ${d.descricao}` : ""}`)
    .join("\n");
  return `\n\nDEPARTAMENTOS HUMANOS (transferência):
${lista}
- Se o cliente pedir para falar com um setor/humano, ou o assunto for claramente de um departamento acima e você não conseguir resolver, chame transferir_departamento com o nome exato e um resumo do que ele precisa.
- Antes de transferir, avise o cliente com naturalidade (ex: "vou te passar para o nosso financeiro, um instante").
- NÃO transfira por qualquer coisa — só quando o atendimento humano daquele setor for realmente necessário.`;
}

// Lista as etapas do funil e ensina o agente a mover o lead conforme a conversa evolui.
// Usa o pipeline da oportunidade aberta do lead — ou o pipeline padrão (primeiro) se ele
// ainda não está no funil.
async function buildPipelineContext(agentConfigId: string, conversationId: string): Promise<string> {
  const currentOpp = await prisma.opportunity.findFirst({
    where: { conversationId, wonAt: null },
    orderBy: { createdAt: "desc" },
    include: { stage: { select: { name: true, pipelineId: true } } },
  });

  const pipeline = currentOpp?.stage
    ? await prisma.pipeline.findUnique({ where: { id: currentOpp.stage.pipelineId }, include: { stages: { orderBy: { order: "asc" } } } })
    : await prisma.pipeline.findFirst({ where: { agentConfigId }, orderBy: { order: "asc" }, include: { stages: { orderBy: { order: "asc" } } } });

  if (!pipeline || pipeline.stages.length === 0) return "";

  const etapas = pipeline.stages.map(s => s.name).join(" → ");
  const atual = currentOpp?.stage?.name ?? "(ainda fora do funil)";

  return `\n\nFUNIL DE VENDAS (avanço automático ativado):
Funil "${pipeline.name}", etapas em ordem: ${etapas}
Etapa atual deste lead: ${atual}
- Acompanhe a conversa e, quando o lead der um sinal CLARO de evolução (demonstrou interesse real, pediu preço/orçamento, agendou, confirmou compra...), chame mover_etapa_funil com o nome exato da etapa adequada e o motivo.
- Avance no máximo UMA etapa por vez, e só com sinal claro — na dúvida, não mova.
- Se o lead desistir explicitamente ou esfriar, pode voltar etapa. Nunca anuncie ao cliente que ele "mudou de etapa" — isso é controle interno.`;
}

function buildPosVendaContext(reviewLink: string): string {
  return `\n\nPÓS-VENDA E SATISFAÇÃO:
- Após uma compra, o cliente pode receber uma pesquisa de satisfação (nota de 0 a 5). Quando ele responder com uma nota ou der feedback claro sobre a experiência, chame registrar_avaliacao com a nota e o comentário dele.
- Siga exatamente a orientação que a ferramenta retornar (agradecer, pedir desculpas ou enviar o link de avaliação).
- Se o cliente relatar problema com o pedido (defeito, atraso, item errado), demonstre empatia, colete os detalhes e registre a avaliação com nota baixa e o problema no comentário — a equipe é avisada automaticamente.${reviewLink ? `\n- Link público de avaliação da empresa: ${reviewLink} — só envie quando a ferramenta orientar (nota alta).` : ""}`;
}

const CAMBIO_LABEL: Record<string, string> = { MANUAL: "Manual", AUTOMATICO: "Automático" };
const COMBUSTIVEL_LABEL: Record<string, string> = { FLEX: "Flex", GASOLINA: "Gasolina", ETANOL: "Etanol", DIESEL: "Diesel", ELETRICO: "Elétrico", HIBRIDO: "Híbrido", GNV: "GNV" };
const CONDICAO_VEICULO_LABEL: Record<string, string> = { NOVO: "Novo", SEMINOVO: "Seminovo", USADO: "Usado" };
const TIPO_NEGOCIO_LABEL: Record<string, string> = { VENDA: "Venda", ALUGUEL: "Aluguel" };
const TIPO_IMOVEL_LABEL: Record<string, string> = { CASA: "Casa", APARTAMENTO: "Apartamento", COMERCIAL: "Comercial", TERRENO: "Terreno" };

function buildInstallmentNote(config: {
  installmentsEnabled: boolean; maxInstallments: number; interestFreeInstallments: number; installmentInterestRate: number;
}): string {
  if (!config.installmentsEnabled || config.maxInstallments <= 1) {
    return "Pagamento com cartão é sempre à vista (parcelamento não disponível) — não ofereça parcelas.";
  }
  const semJuros = Math.min(config.interestFreeInstallments, config.maxInstallments);
  const temJuros = config.installmentInterestRate > 0 && semJuros < config.maxInstallments;
  return `Cartão pode ser parcelado em até ${config.maxInstallments}x. Pergunte em quantas vezes o cliente quer pagar e passe esse número em "parcelas".`
    + (temJuros
      ? ` Até ${semJuros}x não tem acréscimo; a partir de ${semJuros + 1}x tem acréscimo de ${config.installmentInterestRate}% por parcela — avise o cliente disso antes de gerar a cobrança.`
      : ` Sem acréscimo em nenhuma quantidade de parcelas até o limite.`);
}

type PrevendaVeiculoConfig = {
  enabled: boolean; restricoes: string; schedulingEnabled: boolean;
  etapaVeiculo: boolean; etapaQualificacao: boolean; etapaDocumentos: boolean;
};

async function buildCommerceContext(agentConfigId: string, config: {
  catalogType: string; catalogOnly: boolean; installmentsEnabled: boolean; maxInstallments: number; interestFreeInstallments: number; installmentInterestRate: number;
  deliveryEnabled: boolean; pickupEnabled: boolean; deliveryFee: number; deliveryFreeAbove: number | null; deliveryArea: string;
  prevendaVeiculoEnabled: boolean; prevendaVeiculoRestricoes: string; schedulingEnabled: boolean;
  prevendaEtapaVeiculoEnabled: boolean; prevendaEtapaQualificacaoEnabled: boolean; prevendaEtapaDocumentosEnabled: boolean;
}): Promise<string> {
  const prevenda: PrevendaVeiculoConfig = {
    enabled: config.prevendaVeiculoEnabled, restricoes: config.prevendaVeiculoRestricoes, schedulingEnabled: config.schedulingEnabled,
    etapaVeiculo: config.prevendaEtapaVeiculoEnabled, etapaQualificacao: config.prevendaEtapaQualificacaoEnabled, etapaDocumentos: config.prevendaEtapaDocumentosEnabled,
  };
  return config.catalogType !== "GENERICO"
    ? buildBrowseOnlyCommerceContext(agentConfigId, config.catalogType, prevenda)
    : buildGenericCommerceContext(agentConfigId, config);
}

// Catálogo de Veículos/Imóveis: não usa carrinho/pedido/pagamento — a IA só mostra itens
// e encaminha o interessado pra um consultor humano fechar a negociação
async function buildBrowseOnlyCommerceContext(agentConfigId: string, catalogType: string, prevenda: PrevendaVeiculoConfig): Promise<string> {
  const products = await prisma.product.findMany({ where: { agentConfigId, active: true }, select: { name: true, price: true } });
  const catalogo = products.length > 0
    ? products.map(p => `- ${p.name}: R$ ${p.price.toFixed(2)}`).join("\n")
    : (catalogType === "VEICULOS" ? "Nenhum veículo cadastrado ainda." : "Nenhum imóvel cadastrado ainda.");

  const catalogUrl = `${process.env.NEXT_PUBLIC_APP_URL}/loja/${await ensureStoreSlug(agentConfigId)}`;
  const item = catalogType === "VEICULOS" ? "veículo" : "imóvel";

  // Pré-vendas: só veículos têm o fluxo estruturado (SDR em etapas), e só quando o gestor
  // ativou prevendaVeiculoEnabled. Cada etapa de coleta liga/desliga independente — monta a
  // lista numerada só com as etapas realmente ativas. Sem nenhuma ligada (ou pra imóveis),
  // mantém o encaminhamento simples de sempre.
  let prevendaBlock: string;
  if (catalogType === "VEICULOS" && prevenda.enabled) {
    const passos: string[] = [];
    if (prevenda.etapaVeiculo) {
      passos.push("Responda rápido e entenda o que o cliente procura (tipo, modelo, ano, faixa de preço); use consultar_produtos pra sugerir opções do estoque, e chame registrar_veiculo_interesse assim que tiver isso.");
    }
    if (prevenda.etapaQualificacao) {
      passos.push("Pergunte forma de pagamento (à vista/financiado), se tem veículo pra dar de troca, quanto pretende dar de entrada, qual parcela cabe no orçamento, e quando pretende comprar (hoje/esta semana/este mês/só pesquisando). Chame registrar_qualificacao_veiculo.");
    }
    if (prevenda.etapaDocumentos) {
      passos.push("Se for financiado, colete nome completo, CPF, data de nascimento, se possui CNH (e estado civil/profissão se perguntado) e chame registrar_documentos_financiamento — esses dados são só pra iniciar a simulação de crédito, você NUNCA calcula ou aprova financiamento.");
    }
    if (prevenda.schedulingEnabled) {
      passos.push("Ofereça agendar uma visita à loja (use os horários disponíveis normalmente) antes de transferir, se o cliente topar.");
    }
    passos.push("Chame transferir_vendedor_veiculo pra encerrar — o vendedor recebe tudo que você já registrou nas etapas anteriores, não repita os dados no resumo.");

    const restricoesBlock = prevenda.restricoes.trim()
      ? `\n\nNUNCA FAÇA (regras definidas pela gestão):\n${prevenda.restricoes.trim()}`
      : "";

    prevendaBlock = `- Fluxo de pré-vendas (SDR), em etapas — vá conduzindo a conversa nessa ordem, sem pular etapas:\n${passos.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}${restricoesBlock}`;
  } else {
    prevendaBlock = `- Esse tipo de negócio não usa carrinho/pedido pelo WhatsApp: quando o cliente demonstrar interesse real em um ${item} específico, colete nome e contato dele e avise que um consultor vai dar continuidade — não tente "fechar pedido" nem gerar cobrança.`;
  }

  return `\n\nFERRAMENTAS DE CATÁLOGO:
Catálogo disponível (use consultar_produtos pra confirmar — esse resumo pode estar desatualizado):
${catalogo}

Catálogo online (link público): ${catalogUrl}
- Se o cliente pedir pra ver o catálogo, o que tem disponível ou algo parecido, envie o link acima.
- Envie o link puro, sem colchetes nem parênteses em volta, pra ficar clicável.
- Use consultar_produtos pra responder sobre ${item}s disponíveis — nunca invente item, preço ou característica fora dessa lista.
- Se o cliente pedir pra ver fotos, use enviar_foto_produto.
${prevendaBlock}`;
}

async function buildGenericCommerceContext(agentConfigId: string, config: {
  catalogOnly: boolean; installmentsEnabled: boolean; maxInstallments: number; interestFreeInstallments: number; installmentInterestRate: number;
  deliveryEnabled: boolean; pickupEnabled: boolean; deliveryFee: number; deliveryFreeAbove: number | null; deliveryArea: string;
}): Promise<string> {
  const products = await prisma.product.findMany({ where: { agentConfigId, active: true }, select: { name: true, price: true } });
  const catalogo = products.length > 0
    ? products.map(p => `- ${p.name}: R$ ${p.price.toFixed(2)}`).join("\n")
    : "Nenhum produto cadastrado ainda.";

  const pagamentoBlock = config.catalogOnly
    ? `- Esta loja não processa pagamentos online pelo WhatsApp. Depois de registrar os itens desejados com montar_pedido, informe ao cliente que um atendente entrará em contato para combinar o pagamento.`
    : `- Confirme com o cliente os itens e o total antes de gerar a cobrança.
- Pergunte a forma de pagamento (Pix ou cartão) e peça o CPF/CNPJ do cliente (exigido pra qualquer cobrança), se ele ainda não tiver informado.
- Se for cartão: ${buildInstallmentNote(config)}
- Use gerar_cobranca só depois que o cliente confirmar o pedido, a forma de pagamento, o CPF/CNPJ e (se cartão) as parcelas. Se for Pix, explique que ele pode pagar com o código copia-e-cola retornado. Se for cartão, mande o link de checkout retornado e explique que ele deve abrir o link pra digitar os dados do cartão — NUNCA peça número de cartão direto no WhatsApp.
- IMPORTANTE: quando o cliente já confirmou tudo que falta (itens, forma de pagamento, CPF/CNPJ e parcelas se for cartão), chame a ferramenta JÁ NESSA MESMA RESPOSTA — nunca diga "vou gerar" ou "um momento" sem ter chamado a ferramenta antes de responder.`;

  const catalogUrl = `${process.env.NEXT_PUBLIC_APP_URL}/loja/${await ensureStoreSlug(agentConfigId)}`;

  return `\n\nFERRAMENTAS DE COMÉRCIO:
Catálogo de produtos (use consultar_produtos pra confirmar — esse resumo pode estar desatualizado):
${catalogo}

Catálogo online da loja (link público): ${catalogUrl}
- Se o cliente pedir o catálogo, cardápio, lista de produtos, "o que vocês vendem" ou algo parecido, envie o link do catálogo online acima e explique que lá ele vê fotos e preços, monta o carrinho e finaliza o pedido aqui mesmo no WhatsApp.
- Envie o link puro, sem colchetes nem parênteses em volta, pra ficar clicável.

Quando o cliente quiser comprar algo:
- Use consultar_produtos pra confirmar nome exato, preço e estoque antes de montar o pedido — nunca invente produto, preço ou estoque fora dessa lista.
- Use montar_pedido sempre que o cliente definir ou mudar os itens — passe a lista COMPLETA de itens desejados (substitui o pedido anterior, não é incremental).
${pagamentoBlock}
${await buildDeliveryBlock(agentConfigId, config)}
- Se o cliente perguntar sobre um pedido já feito, use consultar_status_pedido.
- Se o cliente pedir pra ver o produto ou perguntar se tem foto, use enviar_foto_produto.`;
}

async function buildDeliveryBlock(agentConfigId: string, config: {
  deliveryEnabled: boolean; pickupEnabled: boolean; deliveryFee: number; deliveryFreeAbove: number | null; deliveryArea: string;
}): Promise<string> {
  if (!config.deliveryEnabled) {
    return `- Entrega: essa loja NÃO faz entrega — o pedido é retirado no local. Depois de montar o pedido, registre com definir_entrega (tipo RETIRADA).`;
  }
  const zones = await prisma.deliveryZone.findMany({ where: { agentConfigId }, orderBy: { order: "asc" } });
  const opcoes = config.pickupEnabled ? "ENTREGA ou RETIRADA no local" : "somente ENTREGA (não há retirada)";

  const gratis = config.deliveryFreeAbove != null
    ? ` Frete GRÁTIS para pedidos a partir de R$ ${config.deliveryFreeAbove.toFixed(2)}.`
    : "";

  const taxa = zones.length > 0
    ? `As zonas de entrega e taxas são:\n${zones.map(z => `  - ${z.name}: R$ ${z.fee.toFixed(2)}`).join("\n")}\n  Pergunte o bairro do cliente, identifique a zona correspondente e passe o nome EXATO dela no campo "area" de definir_entrega. Se o bairro não estiver em nenhuma zona, avise que não entregamos lá e ofereça retirada.${gratis}`
    : (config.deliveryFee > 0
        ? `A taxa de entrega é R$ ${config.deliveryFee.toFixed(2)}.${gratis}`
        : "A entrega é gratuita.");

  const area = config.deliveryArea ? `\n- Área e prazo de entrega: ${config.deliveryArea}` : "";
  return `- Entrega: essa loja oferece ${opcoes}. ${taxa}
- Depois de montar o pedido, pergunte como o cliente quer receber. Se for entrega, peça o endereço completo (rua, número, bairro) e registre com definir_entrega — a taxa é calculada e somada automaticamente. É OBRIGATÓRIO registrar a entrega antes de gerar a cobrança.${area}`;
}

async function buildBillingContext(agentConfigId: string, contactNumber: string): Promise<string> {
  const cobrancas = await prisma.cobranca.findMany({
    where: { agentConfigId, contactNumber, status: { in: ["PENDENTE", "BOLETO_GERADO", "VENCIDA"] } },
    orderBy: { vencimento: "asc" },
  });
  const lista = cobrancas.length > 0
    ? cobrancas.map(c => `- ID ${c.id.slice(-6)} | R$ ${c.valor.toFixed(2)} | Venc: ${c.vencimento.toLocaleDateString("pt-BR")} | Status: ${c.status}`)
      .join("\n")
    : "Nenhuma cobrança em aberto encontrada para esse contato.";

  return `\n\nFERRAMENTAS DE COBRANÇA:
Cobranças desse devedor:
${lista}

Como conduzir a conversa de cobrança:
- Seja cordial mas firme. Não prometa descontos ou prazos que não estejam configurados como política da empresa.
- Se o devedor quiser pagar, use enviar_boleto com o ID da cobrança correspondente.
- Se o devedor quiser uma segunda via (re-envio do mesmo boleto), use enviar_boleto — não gera novo boleto, só reenvia o link já existente.
- Se o devedor pedir prazo extra ou nova data de vencimento, use prorrogar_boleto com a nova data confirmada.
- Se o devedor disser que já pagou, use consultar_status_boleto pra confirmar antes de afirmar que recebeu.
- NUNCA invente valores, vencimentos ou status que não venham das ferramentas.
- Se o devedor pedir negociação além do que está configurado, informe que vai consultar um atendente e encerre cordialmente.`;
}

async function buildProspeccaoContext(agentConfigId: string, contactNumber: string): Promise<string | null> {
  const prospect = await prisma.prospect.findFirst({
    where: { agentConfigId, telefone: contactNumber, status: { in: ["ABORDADO", "RESPONDEU"] } },
  });
  if (!prospect) return null;

  return `\n\nCONTEXTO DE PROSPECÇÃO:
Você está em uma conversa de prospecção ativa. O prospect é: ${prospect.nome}${prospect.empresa ? ` (${prospect.empresa})` : ""}, segmento: ${prospect.segmento || "não informado"}.

Seu objetivo é qualificar esse prospect usando o método BANT:
- **Budget (Orçamento)**: Ele tem budget disponível para resolver esse problema?
- **Authority (Autoridade)**: Ele é quem toma a decisão de compra, ou precisa de aprovação?
- **Need (Necessidade)**: Qual a dor principal? Por que ele precisaria do nosso produto/serviço?
- **Timeline (Prazo)**: Quando ele pretende resolver isso?

Conduza a conversa de forma natural — não pareça um questionário. Quando tiver informação suficiente para avaliar, use registrar_qualificacao. Se ele estiver qualificado e quiser avançar, use encaminhar_para_atendente. Se demonstrar interesse em reunião/demo, use registrar_interesse_reuniao.

Notas anteriores: ${prospect.notas || "nenhuma"}.`;
}

function makeExecuteTool(agentConfigId: string, conversationId: string, contactName: string | undefined, contactNumber: string, adapter: ChannelAdapter) {
  async function resolveProfessional(name?: string) {
    if (!name) return null;
    return prisma.professional.findFirst({ where: { agentConfigId, active: true, name: { equals: name, mode: "insensitive" } } });
  }
  async function resolveService(name?: string) {
    if (!name) return null;
    return prisma.service.findFirst({ where: { agentConfigId, active: true, name: { equals: name, mode: "insensitive" } } });
  }

  return async function executeTool(name: string, args: any): Promise<string> {
    const config = await prisma.agentConfig.findUnique({ where: { id: agentConfigId } });
    if (!config) return "Erro interno: configuração do agente não encontrada.";

    if (name === "listar_servicos_profissionais") {
      const [services, professionals] = await Promise.all([
        prisma.service.findMany({ where: { agentConfigId, active: true }, select: { name: true } }),
        prisma.professional.findMany({ where: { agentConfigId, active: true }, select: { name: true } }),
      ]);
      const parts: string[] = [];
      if (services.length > 0) parts.push(`Serviços: ${services.map(s => s.name).join(", ")}`);
      if (professionals.length > 0) parts.push(`Profissionais: ${professionals.map(p => p.name).join(", ")}`);
      return parts.length > 0 ? parts.join("\n") : "Essa empresa não tem serviços ou profissionais cadastrados.";
    }

    if (name === "consultar_horarios_disponiveis") {
      let professional = await resolveProfessional(args?.professional);
      const service = await resolveService(args?.service);

      // Com profissionais cadastrados, todo agendamento precisa pertencer a um deles:
      // 1 ativo = atribui direto; vários = pergunta (configurável) ou une os horários de todos.
      if (!professional) {
        const activePros = await prisma.professional.findMany({ where: { agentConfigId, active: true } });
        if (activePros.length === 1) professional = activePros[0];
        else if (activePros.length > 1) {
          if (config.askProfessionalEnabled) {
            return `Erro: pergunte com qual profissional o cliente quer agendar antes de consultar horários. Profissionais disponíveis: ${activePros.map(p => p.name).join(", ")}.`;
          }
          // Não pergunta: horário disponível = algum profissional livre nele
          const slotDurationAll = service?.durationMinutes ?? config.slotDurationMinutes;
          const merged = new Map<string, { date: string; weekday: string; slots: Set<string> }>();
          for (const pro of activePros) {
            const proBusy = await prisma.appointment.findMany({
              where: { agentConfigId, ...busyStatusWhere(), professionalId: pro.id },
              select: { scheduledAt: true, durationMinutes: true },
            });
            const proAvail = resolveAvailability(config.availability as unknown as AvailabilityRule[], pro.availability as unknown as AvailabilityRule[]);
            const proSlots = getAvailableSlots(proAvail, slotDurationAll, proBusy, undefined, undefined, config.agendarAteEncerramento);
            for (const day of proSlots) {
              if (!merged.has(day.date)) merged.set(day.date, { date: day.date, weekday: day.weekday, slots: new Set() });
              day.slots.forEach((s) => merged.get(day.date)!.slots.add(s));
            }
          }
          const combined = Array.from(merged.values())
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((d) => ({ date: d.date, weekday: d.weekday, slots: Array.from(d.slots).sort() }));
          return formatSlotsForAgent(combined);
        }
      }

      // Memoriza a escolha do cliente nessa conversa, pra usar como fallback se o modelo
      // não repetir o parâmetro service/professional na chamada de agendar_horario.
      if (professional || service) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { ...(professional && { pendingProfessionalId: professional.id }), ...(service && { pendingServiceId: service.id }) },
        });
      }

      const availability = resolveAvailability(config.availability as unknown as AvailabilityRule[], professional?.availability as unknown as AvailabilityRule[] | undefined);
      const slotDuration = service?.durationMinutes ?? config.slotDurationMinutes;

      const busy = await prisma.appointment.findMany({
        where: { agentConfigId, ...busyStatusWhere(), ...(professional ? { professionalId: professional.id } : {}) },
        select: { scheduledAt: true, durationMinutes: true },
      });
      // vagasSimultaneas só vale sem profissional — com profissional, capacidade é 1 por pessoa
      const slots = getAvailableSlots(availability, slotDuration, busy, undefined, undefined, config.agendarAteEncerramento, professional ? 1 : config.vagasSimultaneas);
      return formatSlotsForAgent(slots);
    }

    if (name === "agendar_horario") {
      const { date, time, notes } = args;
      if (!date || !time) return "Erro: data e horário são obrigatórios.";

      const scheduledAt = new Date(`${date}T${time}:00`);
      if (isNaN(scheduledAt.getTime())) return "Erro: data ou horário em formato inválido.";

      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
      let professional = (await resolveProfessional(args?.professional))
        ?? (conversation?.pendingProfessionalId ? await prisma.professional.findUnique({ where: { id: conversation.pendingProfessionalId } }) : null);
      const service = (await resolveService(args?.service))
        ?? (conversation?.pendingServiceId ? await prisma.service.findUnique({ where: { id: conversation.pendingServiceId } }) : null);

      // Nunca deixa agendamento órfão quando existem profissionais cadastrados
      if (!professional) {
        const activePros = await prisma.professional.findMany({ where: { agentConfigId, active: true } });
        if (activePros.length === 1) professional = activePros[0];
        else if (activePros.length > 1) {
          if (config.askProfessionalEnabled) {
            return `Erro: pergunte com qual profissional o cliente quer agendar. Profissionais disponíveis: ${activePros.map(p => p.name).join(", ")}. Depois chame agendar_horario informando o campo professional.`;
          }
          // Não pergunta: atribui ao primeiro profissional livre nesse horário
          const slotDurationPick = service?.durationMinutes ?? config.slotDurationMinutes;
          for (const pro of activePros) {
            const proBusy = await prisma.appointment.findMany({
              where: { agentConfigId, ...busyStatusWhere(), professionalId: pro.id },
              select: { scheduledAt: true, durationMinutes: true },
            });
            const proAvail = resolveAvailability(config.availability as unknown as AvailabilityRule[], pro.availability as unknown as AvailabilityRule[]);
            if (isSlotAvailable(proAvail, slotDurationPick, proBusy, scheduledAt, config.agendarAteEncerramento)) {
              professional = pro;
              break;
            }
          }
          if (!professional) return "Esse horário não está mais disponível com nenhum profissional. Consulte os horários disponíveis novamente e ofereça outra opção ao cliente.";
        }
      }

      const availability = resolveAvailability(config.availability as unknown as AvailabilityRule[], professional?.availability as unknown as AvailabilityRule[] | undefined);
      const slotDuration = service?.durationMinutes ?? config.slotDurationMinutes;

      const busy = await prisma.appointment.findMany({
        where: { agentConfigId, ...busyStatusWhere(), ...(professional ? { professionalId: professional.id } : {}) },
        select: { scheduledAt: true, durationMinutes: true },
      });

      const available = isSlotAvailable(availability, slotDuration, busy, scheduledAt, config.agendarAteEncerramento, professional ? 1 : config.vagasSimultaneas);
      if (!available) return "Esse horário não está mais disponível. Consulte os horários disponíveis novamente e ofereça outra opção ao cliente.";

      const appointment = await prisma.appointment.create({
        data: {
          agentConfigId, conversationId, contactName, contactNumber,
          scheduledAt, durationMinutes: slotDuration, notes: notes ?? "",
          professionalId: professional?.id, serviceId: service?.id,
        },
      });
      await prisma.conversation.update({ where: { id: conversationId }, data: { pendingProfessionalId: null, pendingServiceId: null } });

      // Avisa o profissional no WhatsApp (fire-and-forget)
      notifyProfessionalOfAppointment(appointment.id, "novo");

      // Push no app pro gestor — mesmo padrão do agendamento pela página pública
      const quandoPush = scheduledAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
        " às " + scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      prisma.team.findUnique({ where: { id: config.teamId }, select: { managerId: true } })
        .then(team => team && notifyUsers(
          [team.managerId],
          "Novo agendamento pelo WhatsApp",
          `${contactName || contactNumber} — ${service ? `${service.name} ` : ""}em ${quandoPush}${professional ? ` com ${professional.name}` : ""}`,
          `${process.env.NEXT_PUBLIC_APP_URL}/crm/${config.id}/agenda`,
        ))
        .catch(() => {});

      return `Agendamento confirmado para ${date} às ${time}.`;
    }

    if (name === "cancelar_agendamento") {
      const next = await prisma.appointment.findFirst({
        where: { conversationId, status: "CONFIRMADO", scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
      });
      if (!next) return "Não encontrei nenhum agendamento confirmado para cancelar.";

      await prisma.appointment.update({ where: { id: next.id }, data: { status: "CANCELADO" } });
      notifyProfessionalOfAppointment(next.id, "cancelado");

      // Push no app pro gestor sobre o cancelamento
      const quandoCancel = next.scheduledAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
        " às " + next.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      prisma.team.findUnique({ where: { id: config.teamId }, select: { managerId: true } })
        .then(team => team && notifyUsers(
          [team.managerId],
          "Agendamento cancelado",
          `${contactName || contactNumber} cancelou o horário de ${quandoCancel}.`,
          `${process.env.NEXT_PUBLIC_APP_URL}/crm/${config.id}/agenda`,
        ))
        .catch(() => {});

      return "Agendamento cancelado com sucesso.";
    }

    if (name === "consultar_produtos") {
      const busca = typeof args?.busca === "string" ? args.busca : undefined;
      const products = await prisma.product.findMany({
        where: { agentConfigId, active: true, ...(busca ? { name: { contains: busca, mode: "insensitive" } } : {}) },
        orderBy: { createdAt: "asc" },
      });
      if (products.length === 0) return "Nenhum produto encontrado no catálogo.";
      return products
        .map(p => {
          const preco = p.precoPromocional != null
            ? `R$ ${p.precoPromocional.toFixed(2)} (PROMOÇÃO, de R$ ${p.price.toFixed(2)})`
            : `R$ ${p.price.toFixed(2)}`;
          if (config.catalogType === "VEICULOS") {
            const attrs = [
              (p.anoFabricacao || p.anoModelo) ? `${p.anoFabricacao ?? "?"}/${p.anoModelo ?? "?"}` : "",
              p.km != null ? `${p.km} km` : "",
              p.cor ?? "",
              p.cambio ? CAMBIO_LABEL[p.cambio] ?? p.cambio : "",
              p.combustivel ? COMBUSTIVEL_LABEL[p.combustivel] ?? p.combustivel : "",
              p.condicaoVeiculo ? CONDICAO_VEICULO_LABEL[p.condicaoVeiculo] ?? p.condicaoVeiculo : "",
            ].filter(Boolean).join(", ");
            return `${[p.marca, p.modelo].filter(Boolean).join(" ") || p.name} — ${preco}${attrs ? ` — ${attrs}` : ""}`;
          }
          if (config.catalogType === "IMOVEIS") {
            const attrs = [
              p.areaM2 != null ? `${p.areaM2} m²` : "",
              p.quartos != null ? `${p.quartos} quarto(s)` : "",
              p.banheiros != null ? `${p.banheiros} banheiro(s)` : "",
              p.vagasGaragem != null ? `${p.vagasGaragem} vaga(s)` : "",
            ].filter(Boolean).join(", ");
            const local = [p.bairro, p.cidade].filter(Boolean).join(", ");
            const tipo = [p.tipoImovel ? TIPO_IMOVEL_LABEL[p.tipoImovel] ?? p.tipoImovel : "", p.tipoNegocio ? `para ${TIPO_NEGOCIO_LABEL[p.tipoNegocio] ?? p.tipoNegocio}` : ""].filter(Boolean).join(" ");
            return `${p.name}${tipo ? ` (${tipo})` : ""} — ${preco}${local ? ` — ${local}` : ""}${attrs ? ` — ${attrs}` : ""}`;
          }
          return `${p.name} — ${preco}${p.stock !== null ? ` (estoque: ${p.stock})` : ""}${p.description ? ` — ${p.description}` : ""}`;
        })
        .join("\n");
    }

    if (name === "montar_pedido") {
      if (config.catalogType !== "GENERICO") return "Esse catálogo não usa carrinho de pedidos — colete o interesse do cliente e informe que um consultor vai continuar o atendimento.";
      const itensArg = Array.isArray(args?.itens) ? args.itens : [];
      if (itensArg.length === 0) return "Erro: nenhum item informado.";

      const resolved: { product: Awaited<ReturnType<typeof prisma.product.findFirst>>; nomeBuscado: string; quantidade: number }[] = [];
      for (const item of itensArg) {
        const nomeBuscado = String(item?.produto ?? "");
        const quantidade = Math.max(1, Number(item?.quantidade) || 1);
        const product = await prisma.product.findFirst({ where: { agentConfigId, active: true, name: { equals: nomeBuscado, mode: "insensitive" } } });
        resolved.push({ product, nomeBuscado, quantidade });
      }

      const naoEncontrados = resolved.filter(r => !r.product).map(r => r.nomeBuscado);
      if (naoEncontrados.length > 0) {
        return `Não encontrei esse(s) produto(s) no catálogo: ${naoEncontrados.join(", ")}. Use consultar_produtos pra ver os nomes certos.`;
      }

      // Usa o preço promocional quando disponível (snapshot no momento do pedido)
      const getPreco = (p: NonNullable<(typeof resolved)[number]["product"]>) =>
        p.precoPromocional != null ? p.precoPromocional : p.price;

      const total = resolved.reduce((sum, r) => sum + getPreco(r.product!) * r.quantidade, 0);

      let order = await prisma.order.findFirst({ where: { agentConfigId, conversationId, status: "ABERTO" } });
      const isNewOrder = !order;
      if (!order) {
        order = await prisma.order.create({ data: { agentConfigId, conversationId, contactName: contactName ?? "", contactNumber, status: "ABERTO", total } });
      } else {
        await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
        order = await prisma.order.update({ where: { id: order.id }, data: { total } });
      }

      await prisma.orderItem.createMany({
        data: resolved.map(r => ({ orderId: order!.id, productId: r.product!.id, name: r.product!.name, unitPrice: getPreco(r.product!), quantity: r.quantidade })),
      });

      // Integração com o sistema do cliente (fire-and-forget)
      notifyOrderWebhook(agentConfigId, order.id, isNewOrder ? "order.created" : "order.updated");

      const resumo = resolved.map(r => {
        const p = r.product!;
        const preco = getPreco(p);
        const promoTag = p.precoPromocional != null ? " (PROMOÇÃO)" : "";
        return `${r.quantidade}x ${p.name} (R$ ${(preco * r.quantidade).toFixed(2)}${promoTag})`;
      }).join("\n");
      return `Pedido atualizado:\n${resumo}\nTotal: R$ ${total.toFixed(2)}`;
    }

    if (name === "transferir_departamento") {
      const depNome = typeof args?.departamento === "string" ? args.departamento.trim() : "";
      if (!depNome) return "Erro: informe o departamento de destino.";
      const motivo = typeof args?.motivo === "string" ? args.motivo.trim() : "";

      const departamentos = await prisma.departamento.findMany({
        where: { teamId: config.teamId },
        include: { membros: { select: { profileId: true, profile: { select: { name: true } } } } },
      });
      const lower = depNome.toLowerCase();
      const dep = departamentos.find(d => d.nome.toLowerCase() === lower)
        ?? departamentos.find(d => d.nome.toLowerCase().includes(lower) || lower.includes(d.nome.toLowerCase()));
      if (!dep) return `Erro: departamento "${depNome}" não existe. Disponíveis: ${departamentos.map(d => d.nome).join(", ")}.`;

      // Atribui ao atendente menos ocupado do departamento (conversas ativas atribuídas)
      let assignedToId: string | null = null;
      let assignedName = "";
      if (dep.membros.length > 0) {
        const cargas = await Promise.all(dep.membros.map(async m => ({
          profileId: m.profileId,
          name: m.profile.name,
          abertas: await prisma.conversation.count({
            where: { agentConfigId, assignedToId: m.profileId, status: { not: "FINALIZADO" } },
          }),
        })));
        cargas.sort((a, b) => a.abertas - b.abertas);
        assignedToId = cargas[0].profileId;
        assignedName = cargas[0].name;
      }

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          departamentoId: dep.id,
          humanTakeover: true,
          status: "ATIVO",
          ...(assignedToId ? { assignedToId } : {}),
        },
      });
      await prisma.message.create({
        data: {
          conversationId,
          role: "note",
          content: `Transferida pela IA para o departamento "${dep.nome}"${assignedName ? ` — atribuída a ${assignedName}` : " (sem atendente no setor ainda)"}${motivo ? `. Motivo: ${motivo}` : ""}.`,
        },
      });
      emitChatEvent(agentConfigId, conversationId);

      return `Conversa transferida para "${dep.nome}"${assignedName ? ` (atendente: ${assignedName})` : ""}. Na SUA RESPOSTA, avise o cliente com naturalidade que o setor vai atendê-lo em instantes. Depois desta mensagem você para de responder — o atendimento é humano a partir daqui.`;
    }

    if (name === "registrar_veiculo_interesse") {
      const tipo = args?.tipo === "MOTO" ? "MOTO" : args?.tipo === "CARRO" ? "CARRO" : null;
      const modeloDesejado = typeof args?.modeloDesejado === "string" ? args.modeloDesejado.trim() : "";
      if (!tipo || !modeloDesejado) return "Erro: identifique ao menos o tipo (carro/moto) e o modelo desejado antes de registrar.";

      const anoDesejado = typeof args?.anoDesejado === "string" ? args.anoDesejado.trim() : "";
      const faixaPrecoMin = typeof args?.faixaPrecoMin === "number" ? args.faixaPrecoMin : null;
      const faixaPrecoMax = typeof args?.faixaPrecoMax === "number" ? args.faixaPrecoMax : null;
      const faixa = faixaPrecoMin != null || faixaPrecoMax != null
        ? ` — faixa de preço: ${faixaPrecoMin != null ? `R$ ${faixaPrecoMin.toFixed(2)}` : "?"} a ${faixaPrecoMax != null ? `R$ ${faixaPrecoMax.toFixed(2)}` : "?"}`
        : "";

      await prisma.message.create({
        data: {
          conversationId,
          role: "note",
          content: `Pré-venda: cliente busca ${tipo === "CARRO" ? "carro" : "moto"} — ${modeloDesejado}${anoDesejado ? ` (${anoDesejado})` : ""}${faixa}.`,
        },
      });
      emitChatEvent(agentConfigId, conversationId);
      return "Interesse registrado. Use consultar_produtos pra sugerir opções do estoque que combinem, se ainda não sugeriu.";
    }

    if (name === "registrar_qualificacao_veiculo") {
      const formaPagamento = args?.formaPagamento === "FINANCIADO" ? "FINANCIADO" : args?.formaPagamento === "A_VISTA" ? "A_VISTA" : null;
      const urgenciaCompra = ["HOJE", "ESTA_SEMANA", "ESTE_MES", "PESQUISANDO"].includes(args?.urgenciaCompra) ? args.urgenciaCompra : null;
      if (!formaPagamento || typeof args?.temVeiculoTroca !== "boolean" || !urgenciaCompra) {
        return "Erro: pergunte forma de pagamento (à vista/financiado), se tem veículo pra dar de troca, e quando pretende comprar, antes de registrar.";
      }

      const temVeiculoTroca = args.temVeiculoTroca as boolean;
      const veiculoTrocaDescricao = temVeiculoTroca && typeof args?.veiculoTrocaDescricao === "string" ? args.veiculoTrocaDescricao.trim() : "";
      const valorEntrada = typeof args?.valorEntrada === "number" ? args.valorEntrada : null;
      const parcelaDesejada = typeof args?.parcelaDesejada === "number" ? args.parcelaDesejada : null;
      const urgenciaLabel = { HOJE: "hoje", ESTA_SEMANA: "esta semana", ESTE_MES: "este mês", PESQUISANDO: "só pesquisando" }[urgenciaCompra as string];

      const linhas = [
        `Pagamento: ${formaPagamento === "FINANCIADO" ? "Financiado" : "À vista"}.`,
        `Veículo na troca: ${temVeiculoTroca ? (veiculoTrocaDescricao || "sim, sem detalhes") : "não"}.`,
        valorEntrada != null ? `Entrada: R$ ${valorEntrada.toFixed(2)}.` : null,
        parcelaDesejada != null ? `Parcela que cabe no orçamento: R$ ${parcelaDesejada.toFixed(2)}.` : null,
        `Quando pretende comprar: ${urgenciaLabel}.`,
      ].filter(Boolean).join(" ");

      await prisma.message.create({ data: { conversationId, role: "note", content: `Pré-venda: qualificação — ${linhas}` } });
      emitChatEvent(agentConfigId, conversationId);

      return formaPagamento === "FINANCIADO"
        ? "Qualificação registrada. Agora colete nome completo, CPF, data de nascimento e se possui CNH (estado civil e profissão se a financeira exigir) e chame registrar_documentos_financiamento."
        : "Qualificação registrada. Se o agendamento estiver disponível, ofereça agendar uma visita; senão, chame transferir_vendedor_veiculo.";
    }

    if (name === "registrar_documentos_financiamento") {
      const nomeCompleto = typeof args?.nomeCompleto === "string" ? args.nomeCompleto.trim() : "";
      const cpf = typeof args?.cpf === "string" ? args.cpf.replace(/\D/g, "") : "";
      const dataNascimento = typeof args?.dataNascimento === "string" ? args.dataNascimento.trim() : "";
      if (!nomeCompleto || !cpf || !dataNascimento || typeof args?.possuiCnh !== "boolean") {
        return "Erro: colete nome completo, CPF, data de nascimento e se possui CNH antes de registrar.";
      }
      const possuiCnh = args.possuiCnh as boolean;
      const estadoCivil = typeof args?.estadoCivil === "string" ? args.estadoCivil.trim() : "";
      const profissao = typeof args?.profissao === "string" ? args.profissao.trim() : "";

      const linhas = [
        `Nome: ${nomeCompleto}.`, `CPF: ${cpf}.`, `Nascimento: ${dataNascimento}.`, `CNH: ${possuiCnh ? "sim" : "não"}.`,
        estadoCivil ? `Estado civil: ${estadoCivil}.` : null,
        profissao ? `Profissão: ${profissao}.` : null,
      ].filter(Boolean).join(" ");

      await prisma.message.create({ data: { conversationId, role: "note", content: `Pré-venda: documentos pra financiamento — ${linhas}` } });
      emitChatEvent(agentConfigId, conversationId);

      return "Documentos registrados. Se o agendamento estiver disponível, ofereça agendar uma visita; senão, chame transferir_vendedor_veiculo pra encerrar e encaminhar o cliente pro vendedor rodar a simulação.";
    }

    if (name === "transferir_vendedor_veiculo") {
      const resumo = typeof args?.resumo === "string" ? args.resumo.trim() : "";

      // Não força atribuição — quem assume depende do leadDistributionMode já configurado
      // (RODIZIO/IA_QUALIFICACAO já teriam atribuído antes; PRIMEIRO_A_ASSUMIR/MANUAL ficam
      // pro primeiro humano que agir).
      await prisma.conversation.update({ where: { id: conversationId }, data: { humanTakeover: true, status: "ATIVO" } });
      await prisma.message.create({
        data: { conversationId, role: "note", content: `Pré-venda concluída pela IA — cliente pronto pro vendedor.${resumo ? ` ${resumo}` : ""}` },
      });
      emitChatEvent(agentConfigId, conversationId);

      return "Pré-venda transferida pro vendedor. Na SUA RESPOSTA, avise o cliente com naturalidade que um vendedor vai continuar o atendimento em instantes. Depois desta mensagem você para de responder — o atendimento é humano a partir daqui.";
    }

    if (name === "mover_etapa_funil") {
      const etapaNome = typeof args?.etapa === "string" ? args.etapa.trim() : "";
      if (!etapaNome) return "Erro: informe o nome da etapa de destino.";
      const motivo = typeof args?.motivo === "string" ? args.motivo.trim() : "";

      // Pipeline da oportunidade atual, ou o padrão (primeiro)
      const opp = await prisma.opportunity.findFirst({
        where: { conversationId, wonAt: null },
        orderBy: { createdAt: "desc" },
        include: { stage: { select: { pipelineId: true, name: true } } },
      });
      const pipeline = opp?.stage
        ? await prisma.pipeline.findUnique({ where: { id: opp.stage.pipelineId }, include: { stages: { orderBy: { order: "asc" } } } })
        : await prisma.pipeline.findFirst({ where: { agentConfigId }, orderBy: { order: "asc" }, include: { stages: { orderBy: { order: "asc" } } } });
      if (!pipeline || pipeline.stages.length === 0) return "Erro: não há funil configurado.";

      const lower = etapaNome.toLowerCase();
      const stage = pipeline.stages.find(s => s.name.toLowerCase() === lower)
        ?? pipeline.stages.find(s => s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase()));
      if (!stage) return `Erro: etapa "${etapaNome}" não existe. Etapas disponíveis: ${pipeline.stages.map(s => s.name).join(", ")}.`;

      if (opp) {
        if (opp.stageId === stage.id) return `O lead já está na etapa "${stage.name}".`;
        await prisma.opportunity.update({
          where: { id: opp.id },
          data: { stageId: stage.id, stageEnteredAt: new Date() },
        });
      } else {
        await prisma.opportunity.create({
          data: { conversationId, stageId: stage.id, stageEnteredAt: new Date(), dealValue: 0 },
        });
      }

      await prisma.message.create({
        data: {
          conversationId,
          role: "note",
          content: `Lead movido pela IA para a etapa "${stage.name}"${opp?.stage ? ` (antes: "${opp.stage.name}")` : " (entrou no funil)"}${motivo ? ` — ${motivo}` : ""}.`,
        },
      });
      emitChatEvent(agentConfigId, conversationId);

      return `Lead movido para a etapa "${stage.name}". Continue a conversa normalmente, sem mencionar a mudança de etapa ao cliente.`;
    }

    if (name === "registrar_avaliacao") {
      const nota = Math.max(0, Math.min(5, Math.round(Number(args?.nota))));
      if (!Number.isFinite(nota)) return "Erro: a nota precisa ser um número de 0 a 5.";
      const comentario = typeof args?.comentario === "string" ? args.comentario.trim() : "";

      await prisma.posVendaFeedback.create({
        data: { agentConfigId, contactNumber, contactName: contactName ?? "", rating: nota, comment: comentario },
      });

      if (nota <= 3) {
        // Nota baixa: registra nota interna pra equipe agir
        await prisma.message.create({
          data: {
            conversationId,
            role: "note",
            content: `⚠ Avaliação baixa no pós-venda: nota ${nota}/5${comentario ? ` — "${comentario}"` : ""}. Vale um contato humano.`,
          },
        });
        emitChatEvent(agentConfigId, conversationId);
        return `Avaliação registrada (nota ${nota}/5). Na SUA RESPOSTA: peça desculpas sinceras pela experiência, agradeça o retorno e diga que um responsável da equipe vai entrar em contato pra resolver. NÃO envie link de avaliação.`;
      }

      const reviewLink = config.posVendaReviewLink?.trim();
      return `Avaliação registrada (nota ${nota}/5). Na SUA RESPOSTA: agradeça calorosamente.${reviewLink ? ` Como a nota foi alta, convide o cliente a deixar essa avaliação publicamente e envie o link puro: ${reviewLink}` : ""}`;
    }

    if (name === "definir_entrega") {
      const tipo = args?.tipo === "ENTREGA" ? "ENTREGA" : args?.tipo === "RETIRADA" ? "RETIRADA" : null;
      if (!tipo) return "Erro: pergunte ao cliente se ele quer ENTREGA ou RETIRADA.";
      if (tipo === "ENTREGA" && !config.deliveryEnabled) return "Essa loja não oferece entrega — apenas retirada no local.";
      if (tipo === "RETIRADA" && !config.pickupEnabled) return "Essa loja não oferece retirada — apenas entrega.";

      const endereco = typeof args?.endereco === "string" ? args.endereco.trim() : "";
      if (tipo === "ENTREGA" && !endereco) return "Erro: peça o endereço completo de entrega (rua, número, bairro) antes de definir a entrega.";

      const order = await prisma.order.findFirst({ where: { agentConfigId, conversationId, status: "ABERTO" } });
      if (!order) return "Ainda não há pedido montado nessa conversa. Monte o pedido primeiro com montar_pedido.";

      // Taxa base: da zona (quando a loja usa zonas) ou a taxa padrão
      let baseFee = config.deliveryFee;
      let zoneName = "";
      if (tipo === "ENTREGA") {
        const zones = await prisma.deliveryZone.findMany({ where: { agentConfigId } });
        if (zones.length > 0) {
          const areaArg = typeof args?.area === "string" ? args.area.trim().toLowerCase() : "";
          const zone = zones.find(z => z.name.toLowerCase() === areaArg)
            ?? zones.find(z => areaArg && (z.name.toLowerCase().includes(areaArg) || areaArg.includes(z.name.toLowerCase())));
          if (!zone) {
            return `Erro: informe a zona de entrega no campo "area". Zonas disponíveis: ${zones.map(z => `${z.name} (R$ ${z.fee.toFixed(2)})`).join(", ")}. Se o bairro do cliente não está em nenhuma zona, avise que não entregamos lá e ofereça retirada.`;
          }
          baseFee = zone.fee;
          zoneName = zone.name;
        }
      }

      // Frete grátis quando o subtotal atinge o mínimo configurado
      const fee = tipo === "RETIRADA"
        ? 0
        : (config.deliveryFreeAbove != null && order.total >= config.deliveryFreeAbove ? 0 : baseFee);

      await prisma.order.update({
        where: { id: order.id },
        data: { deliveryType: tipo, deliveryFee: fee, deliveryAddress: endereco, deliveryZone: zoneName },
      });
      notifyOrderWebhook(agentConfigId, order.id, "order.updated");

      if (tipo === "RETIRADA") return `Retirada no local registrada. Total do pedido: R$ ${order.total.toFixed(2)}.`;
      const zonaInfo = zoneName ? ` (zona: ${zoneName})` : "";
      return fee > 0
        ? `Entrega registrada para "${endereco}"${zonaInfo}. Taxa de entrega: R$ ${fee.toFixed(2)}. Total com entrega: R$ ${(order.total + fee).toFixed(2)}.`
        : `Entrega registrada para "${endereco}"${zonaInfo} — frete grátis! Total: R$ ${order.total.toFixed(2)}.`;
    }

    if (name === "gerar_cobranca") {
      if (!config.asaasApiKey) return "Erro interno: pagamento não está configurado pra essa empresa.";

      const formaPagamento = args?.formaPagamento === "CARTAO" ? "CARTAO" : args?.formaPagamento === "PIX" ? "PIX" : null;
      if (!formaPagamento) return "Erro: pergunte ao cliente se ele quer pagar com Pix ou cartão antes de gerar a cobrança.";

      const cpfCnpj = typeof args?.cpfCnpj === "string" ? args.cpfCnpj.replace(/\D/g, "") : "";
      if (!cpfCnpj) return "Erro: peça o CPF ou CNPJ do cliente antes de gerar a cobrança — é exigido pra qualquer forma de pagamento.";

      const order = await prisma.order.findFirst({ where: { agentConfigId, conversationId, status: "ABERTO" }, include: { items: true } });
      if (!order || order.items.length === 0) return "Ainda não há nenhum pedido montado pra gerar a cobrança. Monte o pedido primeiro.";

      // Exige a definição de entrega quando a loja oferece entrega
      if (config.deliveryEnabled && !order.deliveryType) {
        return "Erro: antes de cobrar, pergunte se o cliente quer ENTREGA ou RETIRADA e registre com definir_entrega.";
      }

      // Valor cobrado = itens + taxa de entrega (order.total guarda só o subtotal dos itens)
      const baseTotal = order.total + order.deliveryFee;

      // Parcelamento só se aplica a cartão, e só dentro do limite configurado pra esse agente
      let parcelas = 1;
      let totalComJuros = baseTotal;
      if (formaPagamento === "CARTAO" && config.installmentsEnabled && config.maxInstallments > 1) {
        const pedido = Math.round(Number(args?.parcelas) || 1);
        parcelas = Math.min(Math.max(1, pedido), config.maxInstallments);
        const parcelasComJuros = Math.max(0, parcelas - config.interestFreeInstallments);
        totalComJuros = baseTotal * (1 + (config.installmentInterestRate / 100) * parcelasComJuros);
      }

      try {
        const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
        let asaasCustomerId = conversation?.asaasCustomerId ?? null;
        if (!asaasCustomerId) {
          const customer = await createAsaasCustomer(config.asaasApiKey, config.asaasSandbox, contactName || contactNumber, contactNumber, cpfCnpj);
          asaasCustomerId = customer.id;
          await prisma.conversation.update({ where: { id: conversationId }, data: { asaasCustomerId } });
        }

        const billingType = formaPagamento === "CARTAO" ? "CREDIT_CARD" : "PIX";
        const payment = await createAsaasCharge(
          config.asaasApiKey, config.asaasSandbox, asaasCustomerId, totalComJuros, `Pedido ${order.id.slice(-6)}`, billingType, parcelas
        );

        if (formaPagamento === "CARTAO") {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "AGUARDANDO_PAGAMENTO", asaasPaymentId: payment.id, asaasInvoiceUrl: payment.invoiceUrl, asaasInstallmentId: payment.installment ?? null },
          });
          notifyOrderWebhook(agentConfigId, order.id, "order.updated");
          const parcelaInfo = parcelas > 1 ? ` em ${parcelas}x de R$ ${(totalComJuros / parcelas).toFixed(2)}` : "";
          return `Cobrança gerada, total R$ ${totalComJuros.toFixed(2)}${parcelaInfo}. Link seguro pra pagar com cartão:\n${payment.invoiceUrl}`;
        }

        const qr = await getAsaasPixQrCode(config.asaasApiKey, config.asaasSandbox, payment.id);
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "AGUARDANDO_PAGAMENTO", asaasPaymentId: payment.id, asaasPixPayload: qr.payload, asaasInvoiceUrl: payment.invoiceUrl },
        });

        notifyOrderWebhook(agentConfigId, order.id, "order.updated");

        // Envia o código Pix como mensagem separada pra o cliente conseguir copiar facilmente
        await adapter.sendText(contactNumber, qr.payload).catch(() => {});

        return `[SISTEMA] Pix gerado com sucesso (R$ ${baseTotal.toFixed(2)}). O código Pix copia-e-cola foi enviado automaticamente como mensagem separada. Na SUA RESPOSTA ao cliente, apenas confirme que o Pix foi gerado e que o código está na mensagem acima — NÃO inclua o código, NÃO escreva "[código gerado]" nem qualquer placeholder.`;
      } catch (err) {
        console.error("[whatsapp-inbound] erro ao gerar cobrança:", err);
        return "Não foi possível gerar a cobrança agora. Avise que vai encaminhar pra um atendente confirmar o pagamento.";
      }
    }

    if (name === "consultar_status_pedido") {
      const orders = await prisma.order.findMany({
        where: { agentConfigId, conversationId, status: { not: "ABERTO" } },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { items: true },
      });
      if (orders.length === 0) return "Não encontrei nenhum pedido em andamento pra essa conversa.";
      return orders
        .map(o => `Pedido ${o.id.slice(-6)} — status: ${o.status} — total: R$ ${o.total.toFixed(2)} — itens: ${o.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}`)
        .join("\n\n");
    }

    if (name === "enviar_foto_produto") {
      const nomeBuscado = String(args?.produto ?? "");
      const product = await prisma.product.findFirst({
        where: { agentConfigId, active: true, name: { equals: nomeBuscado, mode: "insensitive" } },
        include: { images: { orderBy: { order: "asc" }, take: 5 } },
      });
      if (!product) return `Não encontrei o produto "${nomeBuscado}" no catálogo.`;
      if (!product.imagemBase64) return `Esse produto ainda não tem foto cadastrada.`;

      // Com galeria (Veículos/Imóveis), manda todas as fotos cadastradas (máx. 5); sem galeria, só a capa
      const fotos = product.images.length > 0 ? product.images : [{ imagemBase64: product.imagemBase64 }];
      try {
        for (const foto of fotos) {
          await adapter.sendMedia(contactNumber, "image", foto.imagemBase64, { caption: product.name });
        }
        return `${fotos.length > 1 ? `${fotos.length} fotos` : "Foto"} de "${product.name}" enviada(s).`;
      } catch (err) {
        console.error("[whatsapp-inbound] erro ao enviar foto do produto:", err);
        return "Não foi possível enviar a foto agora.";
      }
    }

    if (name === "consultar_cobrancas") {
      const cobrancas = await prisma.cobranca.findMany({
        where: { agentConfigId, contactNumber, status: { in: ["PENDENTE", "BOLETO_GERADO", "VENCIDA"] } },
        orderBy: { vencimento: "asc" },
      });
      if (cobrancas.length === 0) return "Nenhuma cobrança em aberto encontrada para esse contato.";
      return cobrancas
        .map(c => `ID: ${c.id.slice(-6)} | R$ ${c.valor.toFixed(2)} | Venc: ${c.vencimento.toLocaleDateString("pt-BR")} | Status: ${c.status}${c.boletoUrl ? ` | Boleto: ${c.boletoUrl}` : ""}`)
        .join("\n");
    }

    if (name === "enviar_boleto") {
      const cid = typeof args?.cobrancaId === "string" ? args.cobrancaId : "";
      const suffix = cid.length === 6 ? cid : null;
      const cobranca = await prisma.cobranca.findFirst({
        where: { agentConfigId, contactNumber, ...(suffix ? { id: { endsWith: suffix } } : { id: cid }) },
      });
      if (!cobranca) return "Cobrança não encontrada.";
      if (!config.asaasApiKey) return "Pagamento não configurado pra essa empresa.";

      try {
        let { asaasCustomerId, asaasPaymentId, boletoUrl } = cobranca;
        if (!asaasPaymentId) {
          if (!asaasCustomerId) {
            const customer = await createAsaasCustomer(config.asaasApiKey, config.asaasSandbox, cobranca.nomeDevedor, cobranca.contactNumber, cobranca.cpfCnpj || "00000000000");
            asaasCustomerId = customer.id;
          }
          const payment = await createAsaasCharge(config.asaasApiKey, config.asaasSandbox, asaasCustomerId, cobranca.valor, cobranca.descricao || `Cobrança ${cobranca.nomeDevedor}`, "BOLETO", undefined, cobranca.vencimento.toISOString().slice(0, 10));
          asaasPaymentId = payment.id;
          boletoUrl = payment.bankSlipUrl ?? payment.invoiceUrl;
          await prisma.cobranca.update({ where: { id: cobranca.id }, data: { status: "BOLETO_GERADO", asaasCustomerId, asaasPaymentId, boletoUrl } });
        }
        const link = boletoUrl ?? "Link não disponível";
        await adapter.sendText(contactNumber, `Segue o boleto de R$ ${cobranca.valor.toFixed(2)} com vencimento em ${cobranca.vencimento.toLocaleDateString("pt-BR")}:\n${link}`);
        return `Boleto enviado: ${link}`;
      } catch (err) {
        console.error("[whatsapp-inbound] erro ao enviar boleto:", err);
        return "Não foi possível gerar o boleto agora. Um atendente irá ajudar.";
      }
    }

    if (name === "consultar_status_boleto") {
      const cid = typeof args?.cobrancaId === "string" ? args.cobrancaId : "";
      const suffix = cid.length === 6 ? cid : null;
      const cobranca = await prisma.cobranca.findFirst({
        where: { agentConfigId, contactNumber, ...(suffix ? { id: { endsWith: suffix } } : { id: cid }) },
      });
      if (!cobranca) return "Cobrança não encontrada.";
      if (!cobranca.asaasPaymentId || !config.asaasApiKey) return `Status atual: ${cobranca.status}`;

      try {
        const res = await fetch(`${config.asaasSandbox ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3"}/payments/${cobranca.asaasPaymentId}`, {
          headers: { "Content-Type": "application/json", access_token: config.asaasApiKey },
        });
        const data = await res.json();
        if (data.status === "RECEIVED" || data.status === "CONFIRMED") {
          await prisma.cobranca.update({ where: { id: cobranca.id }, data: { status: "PAGO", paidAt: new Date() } });
          return "Pagamento confirmado! Obrigado.";
        }
        return `Status do boleto: ${data.status ?? cobranca.status}`;
      } catch {
        return `Status atual: ${cobranca.status}`;
      }
    }

    if (name === "prorrogar_boleto") {
      const cid = typeof args?.cobrancaId === "string" ? args.cobrancaId : "";
      const novaData = typeof args?.novaData === "string" ? args.novaData : "";
      if (!novaData.match(/^\d{4}-\d{2}-\d{2}$/)) return "Erro: informe a nova data no formato YYYY-MM-DD.";

      const suffix = cid.length === 6 ? cid : null;
      const cobranca = await prisma.cobranca.findFirst({
        where: { agentConfigId, contactNumber, ...(suffix ? { id: { endsWith: suffix } } : { id: cid }) },
      });
      if (!cobranca) return "Cobrança não encontrada.";
      if (!config.asaasApiKey) return "Pagamento não configurado pra essa empresa.";

      try {
        // Cancela o boleto atual no Asaas (se existir) e gera um novo com a nova data
        if (cobranca.asaasPaymentId) {
          await cancelAsaasCharge(config.asaasApiKey, config.asaasSandbox, cobranca.asaasPaymentId);
        }
        let asaasCustomerId = cobranca.asaasCustomerId;
        if (!asaasCustomerId) {
          const customer = await createAsaasCustomer(config.asaasApiKey, config.asaasSandbox, cobranca.nomeDevedor, cobranca.contactNumber, cobranca.cpfCnpj || "00000000000");
          asaasCustomerId = customer.id;
        }
        const payment = await createAsaasCharge(config.asaasApiKey, config.asaasSandbox, asaasCustomerId, cobranca.valor, cobranca.descricao || `Cobrança ${cobranca.nomeDevedor}`, "BOLETO", undefined, novaData);
        const boletoUrl = payment.bankSlipUrl ?? payment.invoiceUrl;
        await prisma.cobranca.update({
          where: { id: cobranca.id },
          data: { vencimento: new Date(novaData), status: "BOLETO_GERADO", asaasCustomerId, asaasPaymentId: payment.id, boletoUrl, reminderCount: 0, lastReminderAt: null },
        });
        await adapter.sendText(contactNumber, `Boleto reemitido com novo vencimento em ${new Date(novaData).toLocaleDateString("pt-BR")}. Valor: R$ ${cobranca.valor.toFixed(2)}.\nLink:\n${boletoUrl}`);
        return `Boleto prorrogado para ${novaData}. Novo link enviado.`;
      } catch (err) {
        console.error("[whatsapp-inbound] erro ao prorrogar boleto:", err);
        return "Não foi possível prorrogar o boleto agora. Um atendente irá verificar.";
      }
    }

    if (name === "registrar_qualificacao") {
      const nivel = args?.nivel as string;
      const notas = typeof args?.notas === "string" ? args.notas : "";
      const statusMap: Record<string, "QUALIFICADO" | "DESCARTADO" | "RESPONDEU"> = {
        QUALIFICADO: "QUALIFICADO",
        NAO_QUALIFICADO: "DESCARTADO",
        REQUER_MAIS_INFO: "RESPONDEU",
      };
      const novoStatus = statusMap[nivel] ?? "RESPONDEU";
      await prisma.prospect.updateMany({
        where: { agentConfigId, telefone: contactNumber, status: { in: ["ABORDADO", "RESPONDEU"] } },
        data: { status: novoStatus, notas },
      });
      return `Qualificação registrada: ${nivel}${notas ? ` — ${notas}` : ""}`;
    }

    if (name === "encaminhar_para_atendente") {
      await prisma.prospect.updateMany({
        where: { agentConfigId, telefone: contactNumber },
        data: { status: "QUALIFICADO" },
      });
      await assignNextAttendant(agentConfigId, config.teamId, conversationId);
      return "Prospect encaminhado para um atendente humano.";
    }

    if (name === "registrar_interesse_reuniao") {
      const notas = typeof args?.notas === "string" ? args.notas : "";
      await prisma.prospect.updateMany({
        where: { agentConfigId, telefone: contactNumber },
        data: { status: "REUNIAO_AGENDADA", ...(notas ? { notas } : {}) },
      });
      return "Interesse em reunião registrado.";
    }

    return "Ferramenta desconhecida.";
  };
}

// Reforça no runtime (não precisa regenerar o systemPrompt de cada agente) o formato de
// bolhas curtas que sendBubbledText (abaixo) depois divide por \n\n e manda uma de cada vez.
const BUBBLE_INSTRUCTION = `

FORMATO DA RESPOSTA — MENSAGENS CURTAS (BOLHAS):
Você está conversando pelo WhatsApp. Escreva como uma pessoa mandando várias mensagens seguidas, nunca um texto único e longo.
- Cada bolha deve ter no máximo 2-3 linhas curtas.
- Separe bolhas diferentes com uma linha em branco (\\n\\n) — cada bloco separado por linha em branco vira uma mensagem separada de verdade.
- Faça apenas UMA pergunta por resposta e pare, esperando o cliente responder, mesmo que o pedido tenha vários itens (ex: se precisa do nome e do telefone, pergunte só o nome primeiro; só peça o telefone depois que o cliente responder).`;

// Manda a resposta da IA em várias mensagens curtas (bolhas) em vez de um texto único —
// o system prompt instrui o modelo a separar cada bolha por linha em branco (\n\n), aqui só
// dividimos por isso e mandamos uma de cada vez, com um delay curto simulando digitação
// humana. Retorna o id do provedor da ÚLTIMA bolha (é o que fica disponível pra citação).
async function sendBubbledText(adapter: ChannelAdapter, phone: string, text: string): Promise<string | null> {
  const bubbles = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  if (bubbles.length === 0) return null;
  let providerId: string | null = null;
  for (let i = 0; i < bubbles.length; i++) {
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    providerId = await adapter.sendText(phone, bubbles[i]);
  }
  return providerId;
}

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function processIncomingMessage(config: AgentConfigFull, msg: IncomingMessage, adapter: ChannelAdapter, opts?: { enforceSessionWindow?: boolean }): Promise<void> {
  const { text, caption, contactNumber, contactName, mediaUrl, mediaType, imageUrl } = msg;

  // Cliente respondeu — zera o contador de follow-up e marca prospect como RESPONDEU se aplicável
  const conversation = await prisma.conversation.upsert({
    where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber } },
    update: { status: "ATIVO", followupCount: 0, ...(contactName && { contactName }) },
    create: { agentConfigId: config.id, contactNumber, contactName, status: "ATIVO", isGroup: msg.isGroup ?? false },
  });
  if (config.prospeccaoEnabled) {
    await prisma.prospect.updateMany({
      where: { agentConfigId: config.id, telefone: contactNumber, status: "ABORDADO" },
      data: { status: "RESPONDEU" },
    });
  }

  // Notas internas nunca entram no contexto da IA nem são contadas aqui — são só pra equipe ver
  const recentMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id, role: { not: "note" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const history = recentMessages.reverse();

  // Cliente respondeu citando uma mensagem: resolve pra nossa Message pelo id do provedor
  const replyToId = msg.quotedWaMessageId
    ? (await prisma.message.findFirst({
        where: { conversationId: conversation.id, waMessageId: msg.quotedWaMessageId },
        select: { id: true },
      }))?.id ?? null
    : null;

  const savedMsg = await prisma.message.create({
    data: {
      conversationId: conversation.id, role: "user", content: text, mediaUrl, mediaType,
      waMessageId: msg.waMessageId ?? null, replyToId, groupSenderName: msg.groupSenderName ?? null,
    },
  });
  emitChatEvent(config.id, conversation.id); // push em tempo real pro CRM

  // Conversa nova + rodízio ativo: já nasce atribuída a um atendente, em ordem
  const isNewConversation = conversation.createdAt.getTime() === conversation.updatedAt.getTime();
  if (isNewConversation && config.leadDistributionMode === "RODIZIO") {
    await assignNextAttendant(config.id, config.teamId, conversation.id);
  }

  // Atendente humano assumiu essa conversa — apenas registra a mensagem, sem o agente
  // responder. Aqui a IA não avisa ninguém respondendo, então dispara web push pro
  // atendente responsável (ou pra equipe toda, se a conversa ainda não tem dono).
  if (conversation.humanTakeover) {
    notifyHumanTakeoverMessage(config, conversation.id, conversation.assignedToId, conversation.contactName ?? contactNumber, text).catch(() => {});
    return;
  }
  // Grupo do WhatsApp — a IA nunca responde automaticamente aqui, só atendente humano. Uma
  // resposta roteirizada de vendas soltada no meio de uma conversa com várias pessoas seria
  // um erro sério, então esse critério não é configurável por agente. A mensagem já foi salva
  // acima (escuta ativa), isso só impede a IA de gerar uma resposta agora.
  if (conversation.isGroup) return;
  // Canal pausado só pra IA (independente de "active", que desliga o canal inteiro) — a
  // mensagem já foi salva acima, só não gera resposta automática
  if (config.whatsappAiPaused) return;
  // Agente ainda não configurado (sem systemPrompt) — conectar o canal não exige configurar
  // o agente primeiro (ver checklist de início do CRM). A conversa aparece normal na caixa
  // de entrada pro atendente responder na mão; só a IA não tem o que usar pra responder.
  if (!config.systemPrompt) return;

  // Debounce: aguarda antes de chamar a IA para contextualizar mensagens enviadas em partes.
  // Se outra mensagem do mesmo contato chegar nesse intervalo, ela é salva no banco e esta
  // chamada retorna sem responder — a mais recente processará o histórico completo.
  const debounceMs = Number(process.env.MESSAGE_DEBOUNCE_MS ?? "8000");
  if (debounceMs > 0) {
    await new Promise(resolve => setTimeout(resolve, debounceMs));
    const latestUserMsg = await prisma.message.findFirst({
      where: { conversationId: conversation.id, role: "user" },
      orderBy: { createdAt: "desc" },
    });
    if (latestUserMsg?.id !== savedMsg.id) return; // mensagem mais nova chegou, ela assumirá o contexto
  }

  // Proteção contra loop IA-com-IA em duas camadas:
  // - rajada: 5+ respostas do agente em 60s (bot rápido, sem debounce)
  // - sustentado: 12+ respostas em 10 minutos (com debounce de 8s cada troca leva 15-30s,
  //   então duas IAs nunca passam de ~4/min — mas mantêm o ritmo SEM PARAR, coisa que
  //   humano não faz; 12 em 10min só acontece em ping-pong automatizado)
  const [burstReplies, sustainedReplies] = await Promise.all([
    prisma.message.count({
      where: { conversationId: conversation.id, role: "assistant", createdAt: { gte: new Date(Date.now() - 60_000) } },
    }),
    prisma.message.count({
      where: { conversationId: conversation.id, role: "assistant", createdAt: { gte: new Date(Date.now() - 10 * 60_000) } },
    }),
  ]);
  if (burstReplies >= 5 || sustainedReplies >= 12) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { humanTakeover: true, status: "ATIVO" },
    });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "note",
        content: `Agente pausado automaticamente: possível contato automatizado detectado (${burstReplies >= 5 ? `${burstReplies} respostas em 60s` : `${sustainedReplies} respostas em 10min`}).`,
      },
    });
    return;
  }

  // WhatsApp Cloud API: só dá pra mandar texto livre até 24h após a última mensagem do
  // cliente — passado isso, só template aprovado. A IA não decide sozinha reabrir a
  // conversa: marca pra um atendente humano avaliar.
  if (opts?.enforceSessionWindow) {
    const windowExpired = Date.now() - savedMsg.createdAt.getTime() > SESSION_WINDOW_MS;
    if (windowExpired) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { humanTakeover: true, status: "ATIVO" },
      });
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "note",
          content: "Janela de 24h da API oficial do WhatsApp expirou — a IA não pode responder por texto livre. Reabra a conversa com um template aprovado antes de continuar.",
        },
      });
      emitChatEvent(config.id, conversation.id);
      return;
    }
  }

  // Mensagens do atendente humano entram como "assistant" para o agente manter o contexto
  // de tudo que já foi dito pela empresa, mesmo no período em que esteve em atendimento manual.
  const historyForAgent = history.map(m => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.content }));

  // Veículos/Imóveis: catálogo sem carrinho — a IA só consulta/mostra fotos, nunca monta pedido/cobrança
  const CART_TOOL_NAMES = ["montar_pedido", "definir_entrega", "gerar_cobranca", "consultar_status_pedido"];
  const commerceTools = config.commerceEnabled
    ? COMMERCE_TOOLS.filter(t => {
        if (config.catalogType !== "GENERICO" && CART_TOOL_NAMES.includes(t.function.name)) return false;
        if (config.catalogOnly && t.function.name === "gerar_cobranca") return false;
        return true;
      })
    : [];
  // Prospecção: inclui as ferramentas se o agente tem prospecção ativa E o contato é um prospect
  const isProspect = config.prospeccaoEnabled
    ? await prisma.prospect.findFirst({ where: { agentConfigId: config.id, telefone: contactNumber, status: { in: ["ABORDADO", "RESPONDEU"] } } })
    : null;
  const departamentos = await prisma.departamento.findMany({
    where: { teamId: config.teamId },
    select: { nome: true, descricao: true },
  });

  // Modo link: a IA só mantém cancelar_agendamento (pros lembretes de confirmação);
  // o resto do fluxo acontece na página pública /agendar
  const schedulingTools = config.schedulingViaLink
    ? SCHEDULING_TOOLS.filter(t => t.function.name === "cancelar_agendamento")
    : SCHEDULING_TOOLS;

  const tools = [
    ...(config.schedulingEnabled ? schedulingTools : []),
    ...commerceTools,
    ...(config.cobrancaEnabled ? BILLING_TOOLS : []),
    ...(config.posVendaEnabled ? POSVENDA_TOOLS : []),
    ...(config.pipelineAutoAvancar ? PIPELINE_TOOLS : []),
    ...(departamentos.length > 0 ? DEPARTAMENTO_TOOLS : []),
    ...(isProspect ? PROSPECTING_TOOLS : []),
    // Pré-vendas de veículos: transferir_vendedor_veiculo não é opcional (é o mecanismo de
    // saída do fluxo) — cada etapa de coleta liga/desliga independente.
    ...(config.commerceEnabled && config.catalogType === "VEICULOS" && config.prevendaVeiculoEnabled
      ? PREVENDA_VEICULO_TOOLS.filter(t => {
          if (t.function.name === "registrar_veiculo_interesse") return config.prevendaEtapaVeiculoEnabled;
          if (t.function.name === "registrar_qualificacao_veiculo") return config.prevendaEtapaQualificacaoEnabled;
          if (t.function.name === "registrar_documentos_financiamento") return config.prevendaEtapaDocumentosEnabled;
          return true; // transferir_vendedor_veiculo — sempre ativa
        })
      : []),
  ];

  // Instrução de emoji injetada em tempo de execução — não exige regenerar o systemPrompt
  const emojiInstruction = config.emojiEnabled
    ? "\n\nEmojis: você PODE e DEVE usar emojis nas respostas para tornar a conversa mais amigável e expressiva."
    : "\n\nEmojis: NUNCA use emojis nas respostas. Mantenha o texto limpo, sem símbolos especiais.";

  // Agente do funil e da etapa: instruções que moldam a IA conforme onde o lead está.
  // Pipeline vale para o funil inteiro; a etapa refina por cima.
  let stageInstruction = "";
  const currentOpp = await prisma.opportunity.findFirst({
    where: { conversationId: conversation.id, wonAt: null, stageId: { not: null } },
    orderBy: { createdAt: "desc" },
    include: { stage: { include: { pipeline: { select: { name: true, agenteInstrucoes: true } } } } },
  });
  if (currentOpp?.stage) {
    const pipelineInstr = currentOpp.stage.pipeline.agenteInstrucoes?.trim();
    const stageInstr = currentOpp.stage.agenteInstrucoes?.trim();
    if (pipelineInstr || stageInstr) {
      stageInstruction = `\n\nAGENTE RESPONSÁVEL PELO FUNIL:
O lead está na etapa "${currentOpp.stage.name}" do funil "${currentOpp.stage.pipeline.name}". Siga estas orientações com PRIORIDADE sobre o comportamento geral:`;
      if (pipelineInstr) stageInstruction += `\n\nOrientações do funil "${currentOpp.stage.pipeline.name}" (valem em todas as etapas):\n${pipelineInstr}`;
      if (stageInstr) stageInstruction += `\n\nOrientações específicas da etapa "${currentOpp.stage.name}" (prioridade máxima):\n${stageInstr}`;
    }
  }

  // Conhecimento entra no activeSystemPrompt (e não no extraContext) porque os três
  // caminhos de resposta (tools, texto puro e imagem) consomem o system prompt
  const conhecimentoContext = await buildConhecimentoContext(config.id);
  const activeSystemPrompt = config.systemPrompt + BUBBLE_INSTRUCTION + emojiInstruction + stageInstruction + conhecimentoContext;

  if (await isOverQuota(config.teamId)) {
    await adapter.sendText(contactNumber, "Serviço de IA temporariamente indisponível. Por favor, aguarde ou entre em contato com nossa equipe.");
    return;
  }

  let reply: string;
  if (imageUrl) {
    const result = await runAgentWithImage(activeSystemPrompt, historyForAgent, imageUrl, caption);
    reply = result.reply;
    logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "whatsapp_agent", ...result.usage });
  } else if (tools.length > 0) {
    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/agendar/${config.storeSlug ?? config.id}`;
    const extraContext = (config.schedulingEnabled
        ? (config.schedulingViaLink
            ? buildSchedulingLinkContext(bookingUrl)
            : await buildSchedulingContext(config.id, config.requisitosAgendamento || undefined, config.restricoesAgendamento || undefined, { enabled: config.atendimentoEspecialEnabled, descricao: config.atendimentoEspecialDescricao }))
        : "")
      + (config.commerceEnabled ? await buildCommerceContext(config.id, config) : "")
      + (config.cobrancaEnabled ? await buildBillingContext(config.id, contactNumber) : "")
      + (config.posVendaEnabled ? buildPosVendaContext(config.posVendaReviewLink) : "")
      + (config.pipelineAutoAvancar ? await buildPipelineContext(config.id, conversation.id) : "")
      + (departamentos.length > 0 ? buildDepartamentosContext(departamentos) : "")
      + (isProspect ? (await buildProspeccaoContext(config.id, contactNumber) ?? "") : "");
    const result = await runAgentWithTools(
      activeSystemPrompt + extraContext,
      historyForAgent,
      text,
      tools,
      makeExecuteTool(config.id, conversation.id, contactName, contactNumber, adapter)
    );
    reply = result.reply;
    logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "whatsapp_agent", ...result.usage });
  } else {
    const result = await runAgent(activeSystemPrompt, historyForAgent, text);
    reply = result.reply;
    logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "whatsapp_agent", ...result.usage });
  }

  const assistantMsg = await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } });
  emitChatEvent(config.id, conversation.id);

  // IA decide quando o lead está qualificado e atribui a um atendente (rodízio), se ainda não tiver dono
  if (config.leadDistributionMode === "IA_QUALIFICACAO" && !conversation.assignedToId) {
    try {
      const { qualified } = await classifyLeadQualified([...historyForAgent, { role: "user", content: text }, { role: "assistant", content: reply }]);
      if (qualified) await assignNextAttendant(config.id, config.teamId, conversation.id);
    } catch (err) {
      console.error("[whatsapp-inbound] erro ao classificar qualificação do lead:", err);
    }
  }

  // Delay configurável antes de começar a responder — simula "lendo/digitando" em vez de
  // bater uma resposta instantânea de bot
  if (config.responseDelaySeconds > 0) {
    await new Promise(resolve => setTimeout(resolve, config.responseDelaySeconds * 1000));
  }

  // Assinatura do agente só entra no texto entregue no WhatsApp (vira uma bolha extra no
  // fim, via o mesmo split por \n\n) — o Message.content salvo no banco fica com a resposta
  // pura, já que o CRM mostra o nome do agente separado, acima da mensagem
  const replyForDelivery = config.agentSignatureEnabled ? `${reply}\n\n_- ${config.nome}_` : reply;

  // Com áudio ativado, cada resposta sai OU como voz OU como texto (nunca os dois) —
  // a porcentagem decide a chance de sair em áudio; se o TTS falhar, cai pro texto.
  const sendAsAudio = config.whatsappVoiceEnabled && config.elevenlabsApiKey && Math.random() * 100 < config.whatsappVoicePercent;

  let providerId: string | null = null;
  if (sendAsAudio) {
    try {
      const audioBuffer = await textToSpeech(reply, { apiKey: config.elevenlabsApiKey!, voiceId: config.elevenlabsVoiceId ?? undefined });
      providerId = await adapter.sendMedia(contactNumber, "audio", audioBuffer.toString("base64"));
    } catch (err) {
      console.error("[whatsapp-inbound] erro ao enviar áudio ElevenLabs, caindo para texto:", err);
      providerId = await sendBubbledText(adapter, contactNumber, replyForDelivery);
    }
  } else {
    providerId = await sendBubbledText(adapter, contactNumber, replyForDelivery);
  }

  // Guarda o id do provedor pra resposta da IA poder ser citada depois (pelo cliente ou pelo atendente)
  if (providerId) {
    await prisma.message.update({ where: { id: assistantMsg.id }, data: { waMessageId: providerId } }).catch(() => {});
  }
}
