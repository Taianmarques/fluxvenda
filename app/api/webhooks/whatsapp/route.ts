import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgent, runAgentWithImage, runAgentWithTools, transcribeAudio, classifyLeadQualified, SCHEDULING_TOOLS, COMMERCE_TOOLS } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam, downloadMessageMedia } from "@/lib/whatsapp";
import { getAvailableSlots, isSlotAvailable, formatSlotsForAgent, type AvailabilityRule } from "@/lib/scheduling";
import { assignNextAttendant } from "@/lib/assignment";
import { createAsaasCustomer, createAsaasCharge, getAsaasPixQrCode } from "@/lib/asaas";

function mediaMimetype(message: any): string | null {
  return typeof message?.content === "object" && typeof message.content?.mimetype === "string"
    ? message.content.mimetype
    : null;
}

async function buildSchedulingContext(agentConfigId: string): Promise<string> {
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
- NUNCA liste todos os horários disponíveis de uma vez. Escolha no máximo 2 ou 3 opções relevantes (próximas ao que o cliente pediu) e ofereça de forma curta e natural, como faria pelo WhatsApp.
- Depois que o cliente escolher um horário, use agendar_horario para confirmar. Só diga que o agendamento foi confirmado depois que essa ferramenta retornar sucesso.

Você também pode receber, no meio da conversa, um lembrete automático perguntando se o cliente confirma presença num agendamento já marcado:
- Se o cliente confirmar (ex: "sim", "confirmado", "pode contar comigo"), apenas agradeça brevemente, sem chamar nenhuma ferramenta.
- Se ele disser que não pode ir ou quer cancelar, use cancelar_agendamento e, na mesma resposta, já ofereça reagendar — pergunte o novo dia/período de preferência (ou, se ele já tiver dito, use consultar_horarios_disponiveis e siga o fluxo normal de agendamento).`;
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
  installmentsEnabled: boolean; maxInstallments: number; interestFreeInstallments: number; installmentInterestRate: number;
}): Promise<string> {
  const products = await prisma.product.findMany({ where: { agentConfigId, active: true }, select: { name: true, price: true } });
  const catalogo = products.length > 0
    ? products.map(p => `- ${p.name}: R$ ${p.price.toFixed(2)}`).join("\n")
    : "Nenhum produto cadastrado ainda.";

  return `\n\nFERRAMENTAS DE COMÉRCIO:
Catálogo de produtos (use consultar_produtos pra confirmar — esse resumo pode estar desatualizado):
${catalogo}

Quando o cliente quiser comprar algo:
- Use consultar_produtos pra confirmar nome exato, preço e estoque antes de montar o pedido — nunca invente produto, preço ou estoque fora dessa lista.
- Use montar_pedido sempre que o cliente definir ou mudar os itens — passe a lista COMPLETA de itens desejados (substitui o pedido anterior, não é incremental).
- Confirme com o cliente os itens e o total antes de gerar a cobrança.
- Pergunte a forma de pagamento (Pix ou cartão) e peça o CPF/CNPJ do cliente (exigido pra qualquer cobrança), se ele ainda não tiver informado.
- Se for cartão: ${buildInstallmentNote(config)}
- Use gerar_cobranca só depois que o cliente confirmar o pedido, a forma de pagamento, o CPF/CNPJ e (se cartão) as parcelas. Se for Pix, explique que ele pode pagar com o código copia-e-cola retornado. Se for cartão, mande o link de checkout retornado e explique que ele deve abrir o link pra digitar os dados do cartão — NUNCA peça número de cartão direto no WhatsApp.
- Se o cliente perguntar sobre um pedido já feito, use consultar_status_pedido.
- IMPORTANTE: quando o cliente já confirmou tudo que falta (itens, forma de pagamento, CPF/CNPJ e parcelas se for cartão), chame a ferramenta JÁ NESSA MESMA RESPOSTA — nunca diga "vou gerar" ou "um momento" sem ter chamado a ferramenta antes de responder. Você só tem essa resposta pra agir, não existe uma próxima rodada automática.`;
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
      const professional = await resolveProfessional(args?.professional);
      const service = await resolveService(args?.service);

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
      const professional = (await resolveProfessional(args?.professional))
        ?? (conversation?.pendingProfessionalId ? await prisma.professional.findUnique({ where: { id: conversation.pendingProfessionalId } }) : null);
      const service = (await resolveService(args?.service))
        ?? (conversation?.pendingServiceId ? await prisma.service.findUnique({ where: { id: conversation.pendingServiceId } }) : null);

      const availability = (professional?.availability ?? config.availability) as unknown as AvailabilityRule[];
      const slotDuration = service?.durationMinutes ?? config.slotDurationMinutes;

      const busy = await prisma.appointment.findMany({
        where: { agentConfigId, status: "CONFIRMADO", ...(professional ? { professionalId: professional.id } : {}) },
        select: { scheduledAt: true, durationMinutes: true },
      });

      const available = isSlotAvailable(availability, slotDuration, busy, scheduledAt);
      if (!available) return "Esse horário não está mais disponível. Consulte os horários disponíveis novamente e ofereça outra opção ao cliente.";

      await prisma.appointment.create({
        data: {
          agentConfigId, conversationId, contactName, contactNumber,
          scheduledAt, durationMinutes: slotDuration, notes: notes ?? "",
          professionalId: professional?.id, serviceId: service?.id,
        },
      });
      await prisma.conversation.update({ where: { id: conversationId }, data: { pendingProfessionalId: null, pendingServiceId: null } });

      return `Agendamento confirmado para ${date} às ${time}.`;
    }

    if (name === "cancelar_agendamento") {
      const next = await prisma.appointment.findFirst({
        where: { conversationId, status: "CONFIRMADO", scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
      });
      if (!next) return "Não encontrei nenhum agendamento confirmado para cancelar.";

      await prisma.appointment.update({ where: { id: next.id }, data: { status: "CANCELADO" } });
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
        .map(p => `${p.name} — R$ ${p.price.toFixed(2)}${p.stock !== null ? ` (estoque: ${p.stock})` : ""}${p.description ? ` — ${p.description}` : ""}`)
        .join("\n");
    }

    if (name === "montar_pedido") {
      const itensArg = Array.isArray(args?.itens) ? args.itens : [];
      if (itensArg.length === 0) return "Erro: nenhum item informado.";

      const resolved: { product: { id: string; name: string; price: number } | null; nomeBuscado: string; quantidade: number }[] = [];
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

      const total = resolved.reduce((sum, r) => sum + r.product!.price * r.quantidade, 0);

      let order = await prisma.order.findFirst({ where: { agentConfigId, conversationId, status: "ABERTO" } });
      if (!order) {
        order = await prisma.order.create({ data: { agentConfigId, conversationId, contactName: contactName ?? "", contactNumber, status: "ABERTO", total } });
      } else {
        await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
        order = await prisma.order.update({ where: { id: order.id }, data: { total } });
      }

      await prisma.orderItem.createMany({
        data: resolved.map(r => ({ orderId: order!.id, productId: r.product!.id, name: r.product!.name, unitPrice: r.product!.price, quantity: r.quantidade })),
      });

      const resumo = resolved.map(r => `${r.quantidade}x ${r.product!.name} (R$ ${(r.product!.price * r.quantidade).toFixed(2)})`).join("\n");
      return `Pedido atualizado:\n${resumo}\nTotal: R$ ${total.toFixed(2)}`;
    }

    if (name === "gerar_cobranca") {
      if (!config.asaasApiKey) return "Erro interno: pagamento não está configurado pra essa empresa.";

      const formaPagamento = args?.formaPagamento === "CARTAO" ? "CARTAO" : args?.formaPagamento === "PIX" ? "PIX" : null;
      if (!formaPagamento) return "Erro: pergunte ao cliente se ele quer pagar com Pix ou cartão antes de gerar a cobrança.";

      const cpfCnpj = typeof args?.cpfCnpj === "string" ? args.cpfCnpj.replace(/\D/g, "") : "";
      if (!cpfCnpj) return "Erro: peça o CPF ou CNPJ do cliente antes de gerar a cobrança — é exigido pra qualquer forma de pagamento.";

      const order = await prisma.order.findFirst({ where: { agentConfigId, conversationId, status: "ABERTO" }, include: { items: true } });
      if (!order || order.items.length === 0) return "Ainda não há nenhum pedido montado pra gerar a cobrança. Monte o pedido primeiro.";

      // Parcelamento só se aplica a cartão, e só dentro do limite configurado pra esse agente
      let parcelas = 1;
      let totalComJuros = order.total;
      if (formaPagamento === "CARTAO" && config.installmentsEnabled && config.maxInstallments > 1) {
        const pedido = Math.round(Number(args?.parcelas) || 1);
        parcelas = Math.min(Math.max(1, pedido), config.maxInstallments);
        const parcelasComJuros = Math.max(0, parcelas - config.interestFreeInstallments);
        totalComJuros = order.total * (1 + (config.installmentInterestRate / 100) * parcelasComJuros);
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
            data: { status: "AGUARDANDO_PAGAMENTO", total: totalComJuros, asaasPaymentId: payment.id, asaasInvoiceUrl: payment.invoiceUrl, asaasInstallmentId: payment.installment ?? null },
          });
          const parcelaInfo = parcelas > 1 ? ` em ${parcelas}x de R$ ${(totalComJuros / parcelas).toFixed(2)}` : "";
          return `Cobrança gerada, total R$ ${totalComJuros.toFixed(2)}${parcelaInfo}. Link seguro pra pagar com cartão:\n${payment.invoiceUrl}`;
        }

        const qr = await getAsaasPixQrCode(config.asaasApiKey, config.asaasSandbox, payment.id);
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "AGUARDANDO_PAGAMENTO", asaasPaymentId: payment.id, asaasPixPayload: qr.payload, asaasInvoiceUrl: payment.invoiceUrl },
        });

        return `Cobrança Pix gerada, total R$ ${order.total.toFixed(2)}. Código Pix copia-e-cola:\n${qr.payload}`;
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

  // Cliente respondeu — zera o contador de follow-up
  const conversation = await prisma.conversation.upsert({
    where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber } },
    update: { status: "ATIVO", followupCount: 0, ...(contactName && { contactName }) },
    create: { agentConfigId: config.id, contactNumber, contactName, status: "ATIVO" },
  });

  // Notas internas nunca entram no contexto da IA nem são contadas aqui — são só pra equipe ver
  const recentMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id, role: { not: "note" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const history = recentMessages.reverse();

  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: text, mediaUrl, mediaType } });

  // Conversa nova + rodízio ativo: já nasce atribuída a um atendente, em ordem
  const isNewConversation = conversation.createdAt.getTime() === conversation.updatedAt.getTime();
  if (isNewConversation && config.leadDistributionMode === "RODIZIO") {
    await assignNextAttendant(config.id, config.teamId, conversation.id);
  }

  // Atendente humano assumiu essa conversa — apenas registra a mensagem, sem o agente responder
  if (conversation.humanTakeover) {
    return NextResponse.json({ ok: true });
  }

  // Mensagens do atendente humano entram como "assistant" para o agente manter o contexto
  // de tudo que já foi dito pela empresa, mesmo no período em que esteve em atendimento manual.
  const historyForAgent = history.map(m => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.content }));

  const tools = [
    ...(config.schedulingEnabled ? SCHEDULING_TOOLS : []),
    ...(config.commerceEnabled ? COMMERCE_TOOLS : []),
  ];

  let reply: string;
  if (imageUrl) {
    reply = await runAgentWithImage(config.systemPrompt, historyForAgent, imageUrl, caption);
  } else if (tools.length > 0) {
    const extraContext = (config.schedulingEnabled ? await buildSchedulingContext(config.id) : "")
      + (config.commerceEnabled ? await buildCommerceContext(config.id, config) : "");
    reply = await runAgentWithTools(
      config.systemPrompt + extraContext,
      historyForAgent,
      text,
      tools,
      makeExecuteTool(config.id, conversation.id, contactName, contactNumber)
    );
  } else {
    reply = await runAgent(config.systemPrompt, historyForAgent, text);
  }

  await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } });

  // IA decide quando o lead está qualificado e atribui a um atendente (rodízio), se ainda não tiver dono
  if (config.leadDistributionMode === "IA_QUALIFICACAO" && !conversation.assignedToId) {
    try {
      const qualified = await classifyLeadQualified([...historyForAgent, { role: "user", content: text }, { role: "assistant", content: reply }]);
      if (qualified) await assignNextAttendant(config.id, config.teamId, conversation.id);
    } catch (err) {
      console.error("[whatsapp-webhook] erro ao classificar qualificação do lead:", err);
    }
  }

  await sendWhatsAppTextAsTeam(config.uazapiToken, contactNumber, reply);

  return NextResponse.json({ ok: true });
}
