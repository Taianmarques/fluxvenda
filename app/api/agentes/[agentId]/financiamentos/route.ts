import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) {
    return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  const simulations = await prisma.financingSimulation.findMany({
    where: { agentConfigId: agentId, ...(status ? { status: status as any } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(simulations.map(s => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    contactNumber: s.contactNumber,
    nomeCliente: s.nomeCliente,
    cpf: s.cpf ? s.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "***.$2.$3-**") : "",
    dataNascimento: s.dataNascimento,
    possuiHabilitacao: s.possuiHabilitacao,
    valorVeiculo: s.valorVeiculo,
    valorEntrada: s.valorEntrada,
    prazoMeses: s.prazoMeses,
    valorParcela: s.valorParcela,
    taxaMensal: s.taxaMensal,
    cet: s.cet,
    valorTotal: s.valorTotal,
    status: s.status,
    notas: s.notas,
  })));
}
