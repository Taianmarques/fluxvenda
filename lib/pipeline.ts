import { prisma } from "@/lib/prisma";

export const DEFAULT_STAGES = [
  { name: "Novo Lead", color: "#3b82f6" },
  { name: "Em Atendimento", color: "#eab308" },
  { name: "Negociação", color: "#f97316" },
  { name: "Fechado", color: "#22c55e" },
  { name: "Perdido", color: "#ef4444" },
];

export async function seedDefaultStages(agentConfigId: string) {
  await prisma.pipelineStage.createMany({
    data: DEFAULT_STAGES.map((s, i) => ({ agentConfigId, name: s.name, color: s.color, order: i })),
  });
}
