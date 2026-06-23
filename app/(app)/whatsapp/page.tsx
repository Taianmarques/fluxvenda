import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WhatsappInbox } from "./WhatsappInbox";

export default async function WhatsappInboxPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) redirect("/dashboard");

  const team = await prisma.team.findUnique({ where: { managerId: user.id }, include: { agentConfig: true } });
  const config = team?.agentConfig;

  if (!config?.active) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <p className="text-5xl">💬</p>
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento para ver as conversas aqui.</p>
          <Link href="/ferramentas/whatsapp" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Configurar agente
          </Link>
        </div>
      </div>
    );
  }

  const [conversations, stages, leadStatuses] = await Promise.all([
    prisma.conversation.findMany({
      where: { agentConfigId: config.id },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.pipelineStage.findMany({ where: { agentConfigId: config.id }, orderBy: { order: "asc" } }),
    prisma.leadStatus.findMany({ where: { agentConfigId: config.id }, orderBy: { order: "asc" } }),
  ]);

  return (
    <WhatsappInbox
      agentName={config.nome}
      initialStages={stages.map(s => ({ id: s.id, name: s.name, color: s.color, order: s.order }))}
      initialLeadStatuses={leadStatuses.map(s => ({ id: s.id, name: s.name, color: s.color, order: s.order }))}
      initialConversations={conversations.map(c => ({
        id: c.id,
        contactName: c.contactName,
        contactNumber: c.contactNumber,
        status: c.status,
        humanTakeover: c.humanTakeover,
        stageId: c.stageId,
        leadStatusId: c.leadStatusId,
        dealValue: c.dealValue,
        updatedAt: c.updatedAt.toISOString(),
        lastMessage: c.messages[0]?.content ?? null,
      }))}
    />
  );
}
