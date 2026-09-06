import { prisma } from "@/lib/prisma";
import { ContasExemploAdminClient } from "./ContasExemploAdminClient";

// Auth já garantida pelo AdminLayout (só ADMIN chega até aqui)
export default async function AdminContasExemploPage() {
  const teams = await prisma.team.findMany({
    where: { isDemo: true },
    orderBy: { createdAt: "desc" },
    include: { agentConfigs: { select: { id: true }, take: 1 } },
  });

  return (
    <ContasExemploAdminClient
      initialContas={teams.map(t => ({
        teamId: t.id,
        name: t.name,
        segmento: t.segment,
        subsegmento: t.subsegment,
        createdAt: t.createdAt.toISOString(),
        agentId: t.agentConfigs[0]?.id ?? null,
      }))}
    />
  );
}
