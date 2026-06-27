import { prisma } from "@/lib/prisma";

export const DEFAULT_STAGES = [
  { name: "Novo Lead", color: "#3b82f6" },
  { name: "Em Atendimento", color: "#eab308" },
  { name: "Negociação", color: "#f97316" },
  { name: "Fechado", color: "#22c55e" },
  { name: "Perdido", color: "#ef4444" },
];

export async function seedDefaultPipeline(agentConfigId: string, name = "Pipeline Principal") {
  const pipeline = await prisma.pipeline.create({ data: { agentConfigId, name, order: 0 } });
  await prisma.pipelineStage.createMany({
    data: DEFAULT_STAGES.map((s, i) => ({ pipelineId: pipeline.id, name: s.name, color: s.color, order: i })),
  });
  return pipeline;
}

export const DEFAULT_LEAD_STATUSES = [
  { name: "Quente", color: "#ef4444" },
  { name: "Morno", color: "#eab308" },
  { name: "Frio", color: "#3b82f6" },
];

export async function seedDefaultLeadStatuses(agentConfigId: string) {
  await prisma.leadStatus.createMany({
    data: DEFAULT_LEAD_STATUSES.map((s, i) => ({ agentConfigId, name: s.name, color: s.color, order: i })),
  });
}
