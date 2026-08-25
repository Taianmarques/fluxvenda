import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { TreinoClient } from "../../treino/TreinoClient";

export default function TreinoPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="treino">
      <TreinoPageContent {...props} />
    </CrmPageGate>
  );
}

async function TreinoPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  if (!result) redirect("/crm");

  const exemplos = await prisma.treinoExemplo.findMany({
    where: { agentConfigId: result.config.id },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <TreinoClient
      agentId={result.config.id}
      isManager={result.isManager}
      exemplos={exemplos.map(e => ({
        id: e.id,
        cenario: e.cenario,
        turnos: e.turnos as { role: "user" | "assistant"; content: string }[],
        temEmbedding: Array.isArray(e.embedding) && e.embedding.length > 0,
        createdByName: e.createdBy?.name ?? null,
      }))}
      similaridadeMinima={result.config.treinoSimilaridadeMinima}
      maxExemplos={result.config.treinoMaxExemplos}
    />
  );
}
