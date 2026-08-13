import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookUser } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
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
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
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

  const [conversations, etiquetas, leadStatuses] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        agentConfigId: config.id,
        isSandbox: false, // conversa de teste do simulador nunca aparece na lista real
        isGroup: false, // grupo do WhatsApp não é lead, fica só na aba Grupos do chat
        // Atendente vê os contatos das conversas dele (mesma regra da caixa de entrada)
        ...(isManager ? {} : { OR: [{ assignedToId: user.id }, { assignedToId: null }] }),
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
    prisma.leadStatus.findMany({
      where: { agentConfigId: config.id },
      orderBy: { order: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  // Um contato por número — se houver mais de uma conversa, fica a de interação mais recente
  const byNumber = new Map<string, Contato>();
  for (const c of conversations) {
    if (byNumber.has(c.contactNumber)) continue;
    byNumber.set(c.contactNumber, {
      conversationId: c.id,
      contactName: c.contactName,
      contactNumber: c.contactNumber,
      leadStatusId: c.leadStatusId,
      leadStatusName: c.leadStatus?.name ?? null,
      leadStatusColor: c.leadStatus?.color ?? null,
      totalGanho: c.opportunities.filter(o => o.wonAt).reduce((s, o) => s + o.dealValue, 0),
      lastMessageAt: c.messages[0]?.createdAt.toISOString() ?? null,
      assignedToId: c.assignedToId,
      atendenteNome: c.assignedTo?.name ?? null,
      nivelCarteira: c.nivelCarteira,
      etiquetas: c.etiquetas,
    });
  }

  return <ContatosClient agentId={config.id} contatos={Array.from(byNumber.values())} etiquetas={etiquetas} leadStatuses={leadStatuses} />;
}
