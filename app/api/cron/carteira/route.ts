import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { logTokenUsage, isOverQuota } from "@/lib/token-usage";
import { emitChatEvent } from "@/lib/realtime";

const MAX_POR_AGENTE = 20; // por tipo, por execução — protege contra rajadas

// Agente de gestão de carteira: pós-venda (agradecimento após pagamento) e recompra
// (reativação de clientes sumidos). Disparado por scheduler externo, como os demais crons:
// Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pós-venda é agente próprio; recompra pertence ao agente de carteira
  const configs = await prisma.agentConfig.findMany({
    where: {
      active: true,
      uazapiToken: { not: null },
      OR: [{ posVendaEnabled: true }, { carteiraEnabled: true, recompraEnabled: true }],
    },
  });

  let posVendaEnviados = 0;
  let recompraEnviados = 0;

  for (const config of configs) {
    const overQuota = await isOverQuota(config.teamId);

    // ─── Pós-venda: pedido pago há mais de X horas (e menos de 7 dias) ─────────
    if (config.posVendaEnabled) {
      const cutoffMax = new Date(Date.now() - config.posVendaDelayHours * 3600_000);
      const cutoffMin = new Date(Date.now() - 7 * 86400_000);

      const orders = await prisma.order.findMany({
        where: {
          agentConfigId: config.id,
          status: "PAGO",
          paidAt: { lte: cutoffMax, gte: cutoffMin },
          contactNumber: { not: { startsWith: "ig_" } }, // janela de 24h do IG inviabiliza
        },
        include: { items: true },
        take: 100,
      });

      let count = 0;
      for (const order of orders) {
        if (count >= MAX_POR_AGENTE) break;
        const jaEnviado = await prisma.carteiraTouch.findFirst({
          where: { agentConfigId: config.id, orderId: order.id, type: "POS_VENDA" },
          select: { id: true },
        });
        if (jaEnviado) continue;

        const conversation = await prisma.conversation.findUnique({
          where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber: order.contactNumber } },
        });
        if (conversation?.humanTakeover) continue;

        const nome = order.contactName || "cliente";
        const itens = order.items.map(i => `${i.quantity}x ${i.name}`).join(", ");
        const pedirNota = config.posVendaPesquisaEnabled;

        let mensagem: string;
        if (config.posVendaMensagem.trim()) {
          mensagem = config.posVendaMensagem.replaceAll("{nome}", nome.split(" ")[0]);
          if (pedirNota && !/0 a 5|nota/i.test(mensagem)) {
            mensagem += "\n\nDe 0 a 5, que nota você dá pra sua experiência com a gente?";
          }
        } else {
          if (overQuota || !config.systemPrompt) continue;
          const result = await runAgent(
            config.systemPrompt + (config.carteiraInstrucoes ? `\n\nOrientações da gestão de carteira: ${config.carteiraInstrucoes}` : ""),
            [],
            `[TAREFA DE PÓS-VENDA] O cliente ${nome} comprou e pagou: ${itens}. Escreva UMA mensagem curta de pós-venda no WhatsApp: agradeça a compra, pergunte se está tudo certo com o pedido${pedirNota ? " e peça uma nota de 0 a 5 pra experiência" : ""} e se coloque à disposição. Natural e pessoal, sem parecer automática. Responda SÓ com a mensagem.`
          );
          mensagem = result.reply;
          logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "carteira_posvenda", ...result.usage });
        }

        await sendWhatsAppTextAsTeam(config.uazapiToken!, order.contactNumber, mensagem);
        await prisma.carteiraTouch.create({
          data: { agentConfigId: config.id, contactNumber: order.contactNumber, type: "POS_VENDA", orderId: order.id },
        });
        if (conversation) {
          await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: mensagem } });
          emitChatEvent(config.id, conversation.id);
        }
        posVendaEnviados++;
        count++;
      }
    }

    // ─── Recompra: última compra há mais de X dias (e menos de 180) ────────────
    if (config.carteiraEnabled && config.recompraEnabled) {
      const cutoff = new Date(Date.now() - config.recompraDias * 86400_000);
      const cutoffAntigo = new Date(Date.now() - 180 * 86400_000);

      const paidOrders = await prisma.order.findMany({
        where: {
          agentConfigId: config.id,
          status: "PAGO",
          paidAt: { not: null },
          contactNumber: { not: { startsWith: "ig_" } },
        },
        include: { items: true },
        orderBy: { paidAt: "desc" },
      });

      // Última compra (e itens dela) por contato
      const ultimaCompra = new Map<string, { paidAt: Date; nome: string; itens: string }>();
      for (const o of paidOrders) {
        if (!ultimaCompra.has(o.contactNumber)) {
          ultimaCompra.set(o.contactNumber, {
            paidAt: o.paidAt!,
            nome: o.contactName || "cliente",
            itens: o.items.map(i => i.name).join(", "),
          });
        }
      }

      let count = 0;
      for (const [contactNumber, compra] of ultimaCompra) {
        if (count >= MAX_POR_AGENTE) break;
        if (compra.paidAt > cutoff) continue;        // comprou recentemente
        if (compra.paidAt < cutoffAntigo) continue;  // sumido demais — não reativa sozinho

        // Um toque de recompra por ciclo: só reenvia se houve compra depois do último toque
        const ultimoToque = await prisma.carteiraTouch.findFirst({
          where: { agentConfigId: config.id, contactNumber, type: "RECOMPRA" },
          orderBy: { createdAt: "desc" },
        });
        if (ultimoToque && ultimoToque.createdAt > compra.paidAt) continue;

        const conversation = await prisma.conversation.findUnique({
          where: { agentConfigId_contactNumber: { agentConfigId: config.id, contactNumber } },
        });
        if (conversation?.humanTakeover) continue;
        // Conversa ativa nos últimos 3 dias: não interrompe com mensagem de reativação
        if (conversation && conversation.updatedAt > new Date(Date.now() - 3 * 86400_000)) continue;

        if (overQuota || !config.systemPrompt) break;

        const dias = Math.floor((Date.now() - compra.paidAt.getTime()) / 86400_000);
        const result = await runAgent(
          config.systemPrompt + (config.carteiraInstrucoes ? `\n\nOrientações da gestão de carteira: ${config.carteiraInstrucoes}` : ""),
          [],
          `[TAREFA DE RECOMPRA] O cliente ${compra.nome} comprou "${compra.itens}" há ${dias} dias e não voltou. Escreva UMA mensagem curta de reativação no WhatsApp: relembre com leveza a última compra, desperte interesse em comprar de novo (novidade, reposição ou oferta se houver orientação) e convide a responder. Natural e pessoal, sem parecer automática. Responda SÓ com a mensagem.`
        );
        logTokenUsage({ teamId: config.teamId, provider: "openai", model: "gpt-4o-mini", feature: "carteira_recompra", ...result.usage });

        await sendWhatsAppTextAsTeam(config.uazapiToken!, contactNumber, result.reply);
        await prisma.carteiraTouch.create({
          data: { agentConfigId: config.id, contactNumber, type: "RECOMPRA" },
        });
        if (conversation) {
          await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: result.reply } });
          emitChatEvent(config.id, conversation.id);
        }
        recompraEnviados++;
        count++;
      }
    }
  }

  return NextResponse.json({ ok: true, posVendaEnviados, recompraEnviados });
}
