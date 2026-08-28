import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookUser } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { podeVerNaoAtribuidos } from "@/lib/crm-access";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { calcularNiveis } from "@/lib/carteira-nivel";
import { ContatosClient, type Contato } from "../../contatos/ContatosClient";

export default function ContatosPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="contatos">
      <ContatosPageContent {...props} />
    </CrmPageGate>
  );
}

async function ContatosPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;
  const isManager = result?.isManager ?? false;

  if (!config) {
    return (
      <div className="h-full bg-gray-950 p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <BookUser size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Agente não encontrado</h1>
          <Link href="/crm" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Voltar ao CRM
          </Link>
        </div>
      </div>
    );
  }

  const verNaoAtribuidos = isManager || (await podeVerNaoAtribuidos(user.id));

  const [conversations, etiquetas, orders, cobrancas] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        agentConfigId: config.id,
        isSandbox: false, // conversa de teste do simulador nunca aparece na lista real
        isGroup: false, // grupo do WhatsApp não é lead, fica só na aba Grupos do chat
        // Atendente vê os contatos das conversas dele (mesma regra da caixa de entrada)
        ...(isManager ? {} : { OR: [{ assignedToId: user.id }, ...(verNaoAtribuidos ? [{ assignedToId: null }] : [])] }),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        leadStatus: { select: { name: true, color: true } },
        opportunities: { select: { dealValue: true, wonAt: true } },
        messages: { where: { role: { not: "note" } }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        assignedTo: { select: { name: true } },
        etiquetas: { select: { id: true, nome: true, cor: true } },
      },
    }),
    prisma.etiqueta.findMany({
      where: { agentConfigId: config.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, nome: true, cor: true },
    }),
    // Nível da carteira usa a mesma régua RFM do resto do CRM (ver lib/carteira-nivel.ts) —
    // precisa do histórico de compras, não só das conversas
    prisma.order.findMany({ where: { agentConfigId: config.id, status: "PAGO" }, select: { contactNumber: true, total: true, deliveryFee: true, paidAt: true } }),
    prisma.cobranca.findMany({ where: { agentConfigId: config.id, status: "PAGO" }, select: { contactNumber: true, valor: true, paidAt: true } }),
  ]);

  // Um contato por número — se houver mais de uma conversa, fica a de interação mais recente
  const byNumber = new Map<string, Contato & { nivelManual: string | null }>();
  for (const c of conversations) {
    if (byNumber.has(c.contactNumber)) continue;
    byNumber.set(c.contactNumber, {
      conversationId: c.id,
      contactName: c.contactName,
      contactNumber: c.contactNumber,
      leadStatusName: c.leadStatus?.name ?? null,
      leadStatusColor: c.leadStatus?.color ?? null,
      totalGanho: c.opportunities.filter(o => o.wonAt).reduce((s, o) => s + o.dealValue, 0),
      lastMessageAt: c.messages[0]?.createdAt.toISOString() ?? null,
      atendenteNome: c.assignedTo?.name ?? null,
      assignedToId: c.assignedToId,
      etiquetas: c.etiquetas,
      conversaStatus: c.status === "FINALIZADO" ? "finalizado" : c.humanTakeover ? "ativo" : "pendente",
      nivel: "C", // preenchido abaixo por calcularNiveis
      nivelManual: c.nivelCarteira,
    });
  }

  // Compras (pedidos pagos + cobranças pagas + oportunidades ganhas) por número, pra régua RFM
  const comprasPorContato = new Map<string, { at: Date; valor: number }[]>();
  function addCompra(numero: string, at: Date | null, valor: number) {
    if (!at) return;
    if (!comprasPorContato.has(numero)) comprasPorContato.set(numero, []);
    comprasPorContato.get(numero)!.push({ at, valor });
  }
  for (const o of orders) addCompra(o.contactNumber, o.paidAt, o.total + o.deliveryFee);
  for (const cb of cobrancas) addCompra(cb.contactNumber, cb.paidAt, cb.valor);
  for (const c of conversations) {
    for (const o of c.opportunities) if (o.wonAt) addCompra(c.contactNumber, o.wonAt, o.dealValue);
  }

  const niveis = calcularNiveis(
    Array.from(byNumber.entries()).map(([contactNumber, c]) => ({
      contactNumber, nivelManual: c.nivelManual, compras: comprasPorContato.get(contactNumber) ?? [],
    })),
    config.carteiraInativoDias,
  );
  for (const [contactNumber, c] of byNumber) c.nivel = niveis.get(contactNumber) ?? "C";

  return (
    <ContatosClient
      agentId={config.id}
      contatos={Array.from(byNumber.values()).map(({ nivelManual: _nivelManual, ...c }) => c)}
      etiquetas={etiquetas}
    />
  );
}
