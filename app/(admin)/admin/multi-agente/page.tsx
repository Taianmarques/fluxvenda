import { prisma } from "@/lib/prisma";
import { FLUXVENDA_TEAM_ID } from "@/lib/internal-agent";
import { MultiAgenteAdminClient } from "./MultiAgenteAdminClient";

// Auth já garantida pelo AdminLayout (só ADMIN chega até aqui)
export default async function AdminMultiAgentePage() {
  const [departamentos, agente] = await Promise.all([
    prisma.departamento.findMany({ where: { teamId: FLUXVENDA_TEAM_ID }, orderBy: { createdAt: "asc" } }),
    prisma.agentConfig.findFirst({ where: { teamId: FLUXVENDA_TEAM_ID, multiAgenteDepartamentos: true } }),
  ]);

  return (
    <MultiAgenteAdminClient
      initialDepartamentos={departamentos.map(d => ({ id: d.id, nome: d.nome, descricao: d.descricao, agenteInstrucoes: d.agenteInstrucoes }))}
      initialAgente={agente ? { id: agente.id, active: agente.active } : null}
    />
  );
}
