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

  const [conversations, orders, paidCobrancas] = await Promise.all([
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
        messages: { where: { role: { not: "note" } }, orderBy: { createdAt: "desc" }, take: 1, select: { role: true } },
      },
    }),
    prisma.order.findMany({
      where: { agentConfigId: config.id, status: { in: ["PAGO", "ABERTO", "AGUARDANDO_PAGAMENTO"] } },
      select: { contactNumber: true, status: true, total: true, deliveryFee: true, paidAt: true, createdAt: true },
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
    const wonOpps = c.opportunities.filter(o => o.wonAt);
    if (existing) {
      for (const o of wonOpps) existing.compras.push({ at: o.wonAt!.toISOString(), valor: o.dealValue });
      if (!existing.contactName && c.contactName) existing.contactName = c.contactName;
      continue;
    }
    byContact.set(c.contactNumber, {
      contactNumber: c.contactNumber,
      contactName: c.contactName,
      conversationId: c.id,
      nivelManual: c.nivelCarteira,
      lastContactAt: c.updatedAt.toISOString(),
      assignedToName: c.assignedTo?.name ?? null,
      leadStatusName: c.leadStatus?.name ?? null,
      leadStatusColor: c.leadStatus?.color ?? null,
      conversaStatus: c.status,
      lastMessageRole: c.messages[0]?.role ?? null,
      compras: wonOpps.map(o => ({ at: o.wonAt!.toISOString(), valor: o.dealValue })),
      orcamentosAbertos: 0,
      orcamentoAbertoValor: 0,
    });
  }

  for (const o of orders) {
    const client = byContact.get(o.contactNumber);
    if (!client) continue;
    if (o.status === "PAGO") {
      if (o.paidAt) client.compras.push({ at: o.paidAt.toISOString(), valor: o.total + o.deliveryFee });
    } else {
      // ABERTO / AGUARDANDO_PAGAMENTO = orçamento em aberto
      client.orcamentosAbertos += 1;
      client.orcamentoAbertoValor += o.total + o.deliveryFee;
    }
  }

  for (const cb of paidCobrancas) {
    const client = byContact.get(cb.contactNumber);
    if (!client || !cb.paidAt) continue;
    client.compras.push({ at: cb.paidAt.toISOString(), valor: cb.valor });
  }

  return (
    <CarteiraClient
      agentId={config.id}
      clientes={Array.from(byContact.values())}
      isManager={isManager}
      inativoDias={config.carteiraInativoDias}
      initialConfig={{
        carteiraEnabled: config.carteiraEnabled,
        posVendaEnabled: config.posVendaEnabled,
        posVendaDelayHours: config.posVendaDelayHours,
        posVendaMensagem: config.posVendaMensagem,
        recompraEnabled: config.recompraEnabled,
        recompraDias: config.recompraDias,
        carteiraInstrucoes: config.carteiraInstrucoes,
        carteiraInativoDias: config.carteiraInativoDias,
      }}
    />
  );
}
