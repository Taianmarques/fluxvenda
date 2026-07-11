import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgent, runAgentWithImage, runAgentWithTools, transcribeAudio, classifyLeadQualified, SCHEDULING_TOOLS, COMMERCE_TOOLS, BILLING_TOOLS, PROSPECTING_TOOLS, POSVENDA_TOOLS, PIPELINE_TOOLS, DEPARTAMENTO_TOOLS } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam, sendMediaAsTeam, downloadMessageMedia } from "@/lib/whatsapp";
import { textToSpeech } from "@/lib/elevenlabs";
import { logTokenUsage, isOverQuota } from "@/lib/token-usage";
import { getAvailableSlots, isSlotAvailable, formatSlotsForAgent, type AvailabilityRule } from "@/lib/scheduling";
import { assignNextAttendant } from "@/lib/assignment";
import { createAsaasCustomer, createAsaasCharge, cancelAsaasCharge, getAsaasPixQrCode } from "@/lib/asaas";
import { ensureStoreSlug } from "@/lib/store-slug";
import { notifyOrderWebhook } from "@/lib/order-webhook";
import { notifyProfessionalOfAppointment } from "@/lib/appointment-notify";
import { emitChatEvent } from "@/lib/realtime";

function mediaMimetype(message: any): string | null {
  return typeof message?.content === "object" && typeof message.content?.mimetype === "string"
    ? message.content.mimetype
    : null;
}

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

async function buildCommerceContext(agentConfigId: string, config: {
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

function makeExecuteTool(agentConfigId: string, conversationId: string, contactName: string | undefined, contactNumber: string) {
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
              where: { agentConfigId, status: "CONFIRMADO", professionalId: pro.id },
              select: { scheduledAt: true, durationMinutes: true },
            });
            const proSlots = getAvailableSlots(pro.availability as unknown as AvailabilityRule[], slotDurationAll, proBusy);
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

      const availability = (professional?.availability ?? config.availability) as unknown as AvailabilityRule[];
      const slotDuration = service?.durationMinutes ?? config.slotDurationMinutes;

      const busy = await prisma.appointment.findMany({
        where: { agentConfigId, status: "CONFIRMADO", ...(professional ? { professionalId: professional.id } : {}) },
        select: { scheduledAt: true, durationMinutes: true },
      });
      const slots = getAvailableSlots(availability, slotDuration, busy);
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
              where: { agentConfigId, status: "CONFIRMADO", professionalId: pro.id },
              select: { scheduledAt: true, durationMinutes: true },
            });
            if (isSlotAvailable(pro.availability as unknown as AvailabilityRule[], slotDurationPick, proBusy, scheduledAt)) {
              professional = pro;
              break;
            }
          }
          if (!professional) return "Esse horário não está mais disponível com nenhum profissional. Consulte os horários disponíveis novamente e ofereça outra opção ao cliente.";
        }
      }

      const availability = (professional?.availability ?? config.availability) as unknown as AvailabilityRule[];
      const slotDuration = service?.durationMinutes ?? config.slotDurationMinutes;

      const busy = await prisma.appointment.findMany({
        where: { agentConfigId, status: "CONFIRMADO", ...(professional ? { professionalId: professional.id } : {}) },
        select: { scheduledAt: true, durationMinutes: true },
      });

      const available = isSlotAvailable(availability, slotDuration, busy, scheduledAt);
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
          return `${p.name} — ${preco}${p.stock !== null ? ` (estoque: ${p.stock})` : ""}${p.description ? ` — ${p.description}` : ""}`;
        })
        .join("\n");
    }

    if (name === "montar_pedido") {
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
        if (config.uazapiToken) {
          await sendWhatsAppTextAsTeam(config.uazapiToken, contactNumber, qr.payload).catch(() => {});
        }

        return `[SISTEMA] Pix gerado com sucesso (R$ ${baseTotal.toFixed(2)}). O código Pix copia-e-cola foi enviado automaticamente como mensagem separada. Na SUA RESPOSTA ao cliente, apenas confirme que o Pix foi gerado e que o código está na mensagem acima — NÃO inclua o código, NÃO escreva "[código gerado]" nem qualquer placeholder.`;
      } catch (err) {
        console.error("[whatsapp-webhook] erro ao gerar cobrança:", err);
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
      const product = await prisma.product.findFirst({ where: { agentConfigId, active: true, name: { equals: nomeBuscado, mode: "insensitive" } } });
      if (!product) return `Não encontrei o produto "${nomeBuscado}" no catálogo.`;
      if (!product.imagemBase64 || !config.uazapiToken) return `Esse produto ainda não tem foto cadastrada.`;

      try {
        await sendMediaAsTeam(config.uazapiToken, contactNumber, "image", product.imagemBase64, { caption: product.name });
        return `Foto de "${product.name}" enviada.`;
      } catch (err) {
        console.error("[whatsapp-webhook] erro ao enviar foto do produto:", err);
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
      if (!config.asaasApiKey || !config.uazapiToken) return "Pagamento não configurado pra essa empresa.";

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
        await sendWhatsAppTextAsTeam(config.uazapiToken, contactNumber, `Segue o boleto de R$ ${cobranca.valor.toFixed(2)} com vencimento em ${cobranca.vencimento.toLocaleDateString("pt-BR")}:\n${link}`);
        return `Boleto enviado: ${link}`;
      } catch (err) {
        console.error("[whatsapp-webhook] erro ao enviar boleto:", err);
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
      if (!config.asaasApiKey || !config.uazapiToken) return "Pagamento não configurado pra essa empresa.";

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
        await sendWhatsAppTextAsTeam(config.uazapiToken, contactNumber, `Boleto reemitido com novo vencimento em ${new Date(novaData).toLocaleDateString("pt-BR")}. Valor: R$ ${cobranca.valor.toFixed(2)}.\nLink:\n${boletoUrl}`);
        return `Boleto prorrogado para ${novaData}. Novo link enviado.`;
      } catch (err) {
        console.error("[whatsapp-webhook] erro ao prorrogar boleto:", err);
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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  if (body.EventType !== "messages") return NextResponse.json({ ok: true });

  const message = body.message;
  const token: string | undefined = body.token;

  // Ignora eco de mensagens enviadas pela própria API, mensagens de grupo ou payloads incompletos
  if (!message || !token || message.fromMe || message.wasSentByApi || message.isGroup) {
    return NextResponse.json({ ok: true });
  }

  const config = await prisma.agentConfig.findFirst({ where: { uazapiToken: token, active: true } });
  if (!config || !config.systemPrompt || !config.uazapiToken) {
    return NextResponse.json({ ok: true });
  }

  const caption: string = typeof message.text === "string" && message.text
    ? message.text
    : (typeof message.content === "string" ? message.content : "");

  const mimetype = mediaMimetype(message);
  let imageUrl: string | null = null;
  let text = caption;
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;

  if (!caption && mimetype?.startsWith("audio/")) {
    try {
      const media = await downloadMessageMedia(config.uazapiToken, message.id || message.messageid);
      text = await transcribeAudio(media.fileURL, media.mimetype);
      mediaUrl = media.fileURL;
      mediaType = "audio";
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao transcrever áudio:", err);
    }
  } else if (mimetype?.startsWith("image/")) {
    try {
      const media = await downloadMessageMedia(config.uazapiToken, message.id || message.messageid);
      imageUrl = media.fileURL;
      mediaUrl = media.fileURL;
      mediaType = "image";
      text = caption ? `[Imagem] ${caption}` : "[Imagem enviada pelo cliente]";
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao baixar imagem:", err);
    }
  }

  if (!text) return NextResponse.json({ ok: true });

  const contactNumber: string = String(message.sender_pn || message.chatid).split("@")[0];
  const contactName: string | undefined = message.senderName || body.chat?.wa_contactName || body.chat?.name;

  // Cliente respondeu — zera o contador de follow-up e marca prospect como RESPONDEU se aplicável
  const conversation = await prisma.conversation.upsert({
    where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber } },
    update: { status: "ATIVO", followupCount: 0, ...(contactName && { contactName }) },
    create: { agentConfigId: config.id, contactNumber, contactName, status: "ATIVO" },
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

  const savedMsg = await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: text, mediaUrl, mediaType } });
  emitChatEvent(config.id, conversation.id); // push em tempo real pro CRM

  // Conversa nova + rodízio ativo: já nasce atribuída a um atendente, em ordem
  const isNewConversation = conversation.createdAt.getTime() === conversation.updatedAt.getTime();
  if (isNewConversation && config.leadDistributionMode === "RODIZIO") {
    await assignNextAttendant(config.id, config.teamId, conversation.id);
  }

  // Atendente humano assumiu essa conversa — apenas registra a mensagem, sem o agente responder
  if (conversation.humanTakeover) {
    return NextResponse.json({ ok: true });
  }

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
    if (latestUserMsg?.id !== savedMsg.id) {
      return NextResponse.json({ ok: true }); // mensagem mais nova chegou, ela assumirá o contexto
    }
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
      data: {
        humanTakeover: true,
        status: "ATIVO",
      },
    });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "note",
        content: `Agente pausado automaticamente: possível contato automatizado detectado (${burstReplies >= 5 ? `${burstReplies} respostas em 60s` : `${sustainedReplies} respostas em 10min`}).`,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Mensagens do atendente humano entram como "assistant" para o agente manter o contexto
  // de tudo que já foi dito pela empresa, mesmo no período em que esteve em atendimento manual.
  const historyForAgent = history.map(m => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.content }));

  const commerceTools = config.commerceEnabled
    ? (config.catalogOnly ? COMMERCE_TOOLS.filter(t => t.function.name !== "gerar_cobranca") : COMMERCE_TOOLS)
    : [];
  // Prospecção: inclui as ferramentas se o agente tem prospecção ativa E o contato é um prospect
  const isProspect = config.prospeccaoEnabled
    ? await prisma.prospect.findFirst({ where: { agentConfigId: config.id, telefone: contactNumber, status: { in: ["ABORDADO", "RESPONDEU"] } } })
    : null;
  const departamentos = await prisma.departamento.findMany({
    where: { teamId: config.teamId },
    select: { nome: true, descricao: true },
  });

  const tools = [
    ...(config.schedulingEnabled ? SCHEDULING_TOOLS : []),
    ...commerceTools,
    ...(config.cobrancaEnabled ? BILLING_TOOLS : []),
    ...(config.posVendaEnabled ? POSVENDA_TOOLS : []),
    ...(config.pipelineAutoAvancar ? PIPELINE_TOOLS : []),
    ...(departamentos.length > 0 ? DEPARTAMENTO_TOOLS : []),
    ...(isProspect ? PROSPECTING_TOOLS : []),
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

  const activeSystemPrompt = config.systemPrompt + emojiInstruction + stageInstruction;

  if (await isOverQuota(config.teamId)) {
    await sendWhatsAppTextAsTeam(config.uazapiToken, contactNumber, "Serviço de IA temporariamente indisponível. Por favor, aguarde ou entre em contato com nossa equipe.");
    return NextResponse.json({ ok: true });
  }

  let reply: string;
  if (imageUrl) {
    const result = await runAgentWithImage(activeSystemPrompt, historyForAgent, imageUrl, caption);
    reply = result.reply;
    logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "whatsapp_agent", ...result.usage });
  } else if (tools.length > 0) {
    const extraContext = (config.schedulingEnabled ? await buildSchedulingContext(config.id, config.requisitosAgendamento || undefined, config.restricoesAgendamento || undefined, { enabled: config.atendimentoEspecialEnabled, descricao: config.atendimentoEspecialDescricao }) : "")
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
      makeExecuteTool(config.id, conversation.id, contactName, contactNumber)
    );
    reply = result.reply;
    logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "whatsapp_agent", ...result.usage });
  } else {
    const result = await runAgent(activeSystemPrompt, historyForAgent, text);
    reply = result.reply;
    logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "whatsapp_agent", ...result.usage });
  }

  await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } });
  emitChatEvent(config.id, conversation.id);

  // IA decide quando o lead está qualificado e atribui a um atendente (rodízio), se ainda não tiver dono
  if (config.leadDistributionMode === "IA_QUALIFICACAO" && !conversation.assignedToId) {
    try {
      const { qualified } = await classifyLeadQualified([...historyForAgent, { role: "user", content: text }, { role: "assistant", content: reply }]);
      if (qualified) await assignNextAttendant(config.id, config.teamId, conversation.id);
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao classificar qualificação do lead:", err);
    }
  }

  // Com áudio ativado, cada resposta sai OU como voz OU como texto (nunca os dois) —
  // a porcentagem decide a chance de sair em áudio; se o TTS falhar, cai pro texto.
  const sendAsAudio = config.whatsappVoiceEnabled && config.elevenlabsApiKey && Math.random() * 100 < config.whatsappVoicePercent;

  if (sendAsAudio) {
    try {
      const audioBuffer = await textToSpeech(reply, { apiKey: config.elevenlabsApiKey!, voiceId: config.elevenlabsVoiceId ?? undefined });
      await sendMediaAsTeam(config.uazapiToken, contactNumber, "audio", audioBuffer.toString("base64"));
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao enviar áudio ElevenLabs, caindo para texto:", err);
      await sendWhatsAppTextAsTeam(config.uazapiToken, contactNumber, reply);
    }
  } else {
    await sendWhatsAppTextAsTeam(config.uazapiToken, contactNumber, reply);
  }

  return NextResponse.json({ ok: true });
}
