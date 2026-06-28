import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getOwnAgentConfigWithRole } from "@/lib/team";
import { PipelineBoardLoader as PipelineBoard } from "./PipelineBoardLoader";

export default async function PipelinePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const result = await getOwnAgentConfigWithRole(user.id);
  const config = result?.config;
  const isManager = result?.isManager ?? false;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <p className="text-5xl">📋</p>
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento para usar o pipeline.</p>
          <Link href="/ferramentas/whatsapp" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Configurar agente
          </Link>
        </div>
      </div>
    );
  }

  const [pipelines, opportunities, leadStatuses] = await Promise.all([
    prisma.pipeline.findMany({
      where: { agentConfigId: config.id },
      orderBy: { order: "asc" },
      include: { stages: { orderBy: { order: "asc" } } },
    }),
    prisma.opportunity.findMany({
      where: {
        conversation: {
          agentConfigId: config.id,
          ...(isManager ? {} : { OR: [{ assignedToId: user.id }, { assignedToId: null }] }),
        },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        conversation: { include: { messages: { where: { role: { not: "note" } }, orderBy: { createdAt: "desc" }, take: 1 } } },
      },
    }),
    prisma.leadStatus.findMany({ where: { agentConfigId: config.id }, orderBy: { order: "asc" } }),
  ]);

  return (
    <PipelineBoard
      initialPipelines={pipelines.map(p => ({
        id: p.id,
        name: p.name,
        order: p.order,
        stages: p.stages.map(s => ({ id: s.id, name: s.name, color: s.color, order: s.order })),
      }))}
      initialLeadStatuses={leadStatuses.map(s => ({ id: s.id, name: s.name, color: s.color, order: s.order }))}
      initialOpportunities={opportunities.map(o => ({
        id: o.id,
        conversationId: o.conversationId,
        contactName: o.conversation.contactName,
        contactNumber: o.conversation.contactNumber,
        leadStatusId: o.conversation.leadStatusId,
        title: o.title,
        stageId: o.stageId,
        dealValue: o.dealValue,
        wonAt: o.wonAt?.toISOString() ?? null,
        updatedAt: o.updatedAt.toISOString(),
        lastMessage: o.conversation.messages[0]?.content ?? null,
      }))}
    />
  );
}
