import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CarteiraClient, type CarteiraCliente } from "../../carteira/CarteiraClient";

export default async function CarteiraPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;
  const isManager = result?.isManager ?? false;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Briefcase size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente para construir a carteira de clientes.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  const [conversations, paidOrders, paidCobrancas] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        agentConfigId: config.id,
        // Atendente vê a carteira dos clientes dele (mesma regra da caixa de entrada)
        ...(isManager ? {} : { OR: [{ assignedToId: user.id }, { assignedToId: null }] }),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        assignedTo: { select: { name: true } },
        leadStatus: { select: { name: true, color: true } },
        opportunities: { select: { dealValue: true, wonAt: true } },
      },
    }),
    prisma.order.findMany({
      where: { agentConfigId: config.id, status: "PAGO" },
      select: { contactNumber: true, total: true, deliveryFee: true, paidAt: true },
    }),
    prisma.cobranca.findMany({
      where: { agentConfigId: config.id, status: "PAGO" },
      select: { contactNumber: true, valor: true, paidAt: true },
    }),
  ]);

  // Consolida por contato: uma conversa por contato (a mais recente vence nos dados de exibição)
  const byContact = new Map<string, CarteiraCliente>();

  for (const c of conversations) {
    const existing = byContact.get(c.contactNumber);
    const wonValue = c.opportunities.filter(o => o.wonAt).reduce((s, o) => s + o.dealValue, 0);
    if (existing) {
      existing.totalComprado += wonValue;
      if (!existing.contactName && c.contactName) existing.contactName = c.contactName;
      continue;
    }
    byContact.set(c.contactNumber, {
      contactNumber: c.contactNumber,
      contactName: c.contactName,
      conversationId: c.id,
      lastContactAt: c.updatedAt.toISOString(),
      assignedToName: c.assignedTo?.name ?? null,
      leadStatusName: c.leadStatus?.name ?? null,
      leadStatusColor: c.leadStatus?.color ?? null,
      totalComprado: wonValue,
      pedidos: 0,
      lastPurchaseAt: null,
    });
  }

  for (const o of paidOrders) {
    const client = byContact.get(o.contactNumber);
    if (!client) continue;
    client.totalComprado += o.total + o.deliveryFee;
    client.pedidos += 1;
    const paid = o.paidAt?.toISOString() ?? null;
    if (paid && (!client.lastPurchaseAt || paid > client.lastPurchaseAt)) client.lastPurchaseAt = paid;
  }

  for (const cb of paidCobrancas) {
    const client = byContact.get(cb.contactNumber);
    if (!client) continue;
    client.totalComprado += cb.valor;
    client.pedidos += 1;
    const paid = cb.paidAt?.toISOString() ?? null;
    if (paid && (!client.lastPurchaseAt || paid > client.lastPurchaseAt)) client.lastPurchaseAt = paid;
  }

  return <CarteiraClient agentId={config.id} clientes={Array.from(byContact.values())} />;
}
