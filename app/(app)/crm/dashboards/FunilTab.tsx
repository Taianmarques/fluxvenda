import { prisma } from "@/lib/prisma";
import type { AgentConfig } from "@/app/generated/prisma/client";
import { FunilVisualization, type FunilPipeline, type FunilLead } from "./FunilVisualization";

export async function FunilTab({ agentId, config }: { agentId: string; config: AgentConfig }) {
  const [pipelines, conversations, opportunities, prospects, paidOrders, paidCobrancas, feedbacks] = await Promise.all([
    prisma.pipeline.findMany({
      where: { agentConfigId: config.id },
      orderBy: { order: "asc" },
      include: { stages: { orderBy: { order: "asc" }, select: { id: true, name: true, color: true } } },
    }),
    prisma.conversation.findMany({
      where: { agentConfigId: config.id },
      select: { id: true, contactNumber: true, createdAt: true },
    }),
    prisma.opportunity.findMany({
      where: { conversation: { agentConfigId: config.id } },
      select: { id: true, conversationId: true, stageId: true, dealValue: true, wonAt: true, createdAt: true },
    }),
    prisma.prospect.findMany({
      where: { agentConfigId: config.id },
      select: { telefone: true },
    }),
    prisma.order.findMany({
      where: { agentConfigId: config.id, status: "PAGO" },
      select: { contactNumber: true, total: true, deliveryFee: true },
    }),
    prisma.cobranca.findMany({
      where: { agentConfigId: config.id, status: "PAGO" },
      select: { contactNumber: true, valor: true },
    }),
    prisma.posVendaFeedback.findMany({
      where: { agentConfigId: config.id },
      select: { contactNumber: true, rating: true },
    }),
  ]);

  // Outbound = contato veio da prospecção ativa (telefone cadastrado como prospect)
  const outboundPhones = new Set(prospects.map(p => p.telefone.replace(/\D/g, "")));

  const leads: FunilLead[] = conversations.map(c => ({
    conversationId: c.id,
    contactNumber: c.contactNumber,
    origem: outboundPhones.has(c.contactNumber.replace(/\D/g, "")) ? "outbound" as const : "inbound" as const,
    createdAt: c.createdAt.toISOString(),
  }));

  const opps = opportunities.map(o => ({
    id: o.id,
    conversationId: o.conversationId,
    stageId: o.stageId,
    dealValue: o.dealValue,
    wonAt: o.wonAt?.toISOString() ?? null,
  }));

  // Compras por contato (pedidos pagos + cobranças pagas) para a metade de retenção
  const compras = [
    ...paidOrders.map(o => ({ contactNumber: o.contactNumber, valor: o.total + o.deliveryFee })),
    ...paidCobrancas.map(c => ({ contactNumber: c.contactNumber, valor: c.valor })),
  ];

  const funilPipelines: FunilPipeline[] = pipelines.map(p => ({
    id: p.id,
    name: p.name,
    stages: p.stages,
  }));

  return (
    <FunilVisualization
      pipelines={funilPipelines}
      leads={leads}
      opportunities={opps}
      compras={compras}
      feedbacks={feedbacks}
      agentId={agentId}
    />
  );
}
