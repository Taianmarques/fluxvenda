import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Filter } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { FunilClient, type FunilPipeline, type FunilLead } from "../../funil/FunilClient";

export default async function FunilPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Filter size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente para ver o funil.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

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
    <FunilClient
      pipelines={funilPipelines}
      leads={leads}
      opportunities={opps}
      compras={compras}
      feedbacks={feedbacks}
      agentId={config.id}
    />
  );
}
